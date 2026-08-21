import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import {
    getBufferedProgress,
    getWaveformFills,
    toCanvasFill,
    WAVEFORM_COLOR_PLAYED,
    WAVEFORM_COLOR_UNPLAYED,
} from './colors';
import { formatTime, morphPeaks, toChannels, WAVEFORM_PEAK_TRANSITION_MS } from './peaks';
import './WaveformView.scss';

export type WaveformViewProps = {
    bufferedRange?: TimeRanges;
    currentTime?: number;
    durationSec: number;
    height?: number;
    interactive?: boolean;
    mediaEl?: HTMLMediaElement | null;
    onSeek?: (timeSec: number) => void;
    peaks: ArrayLike<number>;
};

export const WAVEFORM_BAR_GAP = 2;
export const WAVEFORM_BAR_WIDTH = 2;
export const WAVEFORM_BAR_RADIUS = WAVEFORM_BAR_WIDTH / 2;
/** Total bar height so the top and bottom radii meet as a circle on the mirror. */
export const WAVEFORM_BAR_MIN_HEIGHT = WAVEFORM_BAR_WIDTH;
export const WAVEFORM_HEIGHT = 140;

function leftPercent(timeSec: number, durationSec: number): string {
    const progress = durationSec > 0 ? Math.min(1, Math.max(0, timeSec / durationSec)) : 0;
    return `${progress * 100}%`;
}

function fillWidth(container: HTMLElement | null): number {
    const width = container ? container.clientWidth : 0;
    const pixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    return width * pixelRatio;
}

type WaveSurferRenderer = {
    render?: (data: unknown) => void;
};

function applyPeaks(wavesurfer: WaveSurfer, peaks: ArrayLike<number>, durationSec: number): void {
    const channelData = toChannels(peaks);
    if (wavesurfer.setOptions) {
        wavesurfer.setOptions({
            duration: durationSec,
            peaks: channelData,
        });
    }

    const decoded = wavesurfer.getDecodedData ? wavesurfer.getDecodedData() : null;
    // Private wavesurfer renderer (7.12.11): force a redraw after setOptions(peaks).
    const { renderer } = (wavesurfer as unknown) as { renderer?: WaveSurferRenderer };
    if (decoded && renderer && renderer.render) {
        renderer.render(decoded);
        return;
    }

    if (wavesurfer.load) {
        wavesurfer.load('', channelData, durationSec);
    }
}

/**
 * Renders V1 peaks with wavesurfer. Does not fetch audio or attach a media element.
 */
export default function WaveformView({
    bufferedRange,
    currentTime = 0,
    durationSec,
    height = WAVEFORM_HEIGHT,
    interactive = true,
    mediaEl,
    onSeek,
    peaks,
}: WaveformViewProps): JSX.Element {
    const containerRef = useRef<HTMLDivElement>(null);
    const playheadRef = useRef<HTMLDivElement>(null);
    const playheadRafRef = useRef(0);
    const wavesurferRef = useRef<WaveSurfer | null>(null);
    const onSeekRef = useRef(onSeek);
    const interactiveRef = useRef(interactive);
    const currentTimeRef = useRef(currentTime);
    const peaksRef = useRef(peaks);
    const displayedPeaksRef = useRef<ArrayLike<number> | null>(null);
    const peakTransitionRafRef = useRef(0);
    const durationSecRef = useRef(durationSec);
    onSeekRef.current = onSeek;
    interactiveRef.current = interactive;
    currentTimeRef.current = currentTime;
    peaksRef.current = peaks;
    durationSecRef.current = durationSec;

    const [hoverProgress, setHoverProgress] = useState<number | null>(null);
    const bufferProgress = getBufferedProgress(bufferedRange, durationSec);

    const updatePlayheadPosition = useCallback((timeSec: number): void => {
        const playhead = playheadRef.current;
        if (!playhead) {
            return;
        }

        playhead.style.left = leftPercent(timeSec, durationSecRef.current);

        const wavesurfer = wavesurferRef.current;
        if (wavesurfer && wavesurfer.setTime) {
            wavesurfer.setTime(timeSec);
        }
    }, []);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) {
            return undefined;
        }

        const wavesurfer = WaveSurfer.create({
            autoScroll: false,
            barGap: WAVEFORM_BAR_GAP,
            barMinHeight: WAVEFORM_BAR_MIN_HEIGHT,
            barRadius: WAVEFORM_BAR_RADIUS,
            barWidth: WAVEFORM_BAR_WIDTH,
            container,
            cursorWidth: 0,
            duration: durationSecRef.current,
            fillParent: true,
            height,
            hideScrollbar: true,
            interact: interactiveRef.current,
            normalize: false,
            peaks: toChannels(peaksRef.current),
            progressColor: WAVEFORM_COLOR_PLAYED,
            waveColor: WAVEFORM_COLOR_UNPLAYED,
        });

        const unsubscribeClick = wavesurfer.on('click', (relativeX: number) => {
            if (!interactiveRef.current) {
                return;
            }
            onSeekRef.current?.(relativeX * durationSecRef.current);
        });

        wavesurferRef.current = wavesurfer;
        displayedPeaksRef.current = peaksRef.current;

        return () => {
            window.cancelAnimationFrame(peakTransitionRafRef.current);
            unsubscribeClick();
            wavesurfer.destroy();
            wavesurferRef.current = null;
            displayedPeaksRef.current = null;
        };
    }, [height]);

    useEffect(() => {
        const wavesurfer = wavesurferRef.current;
        if (!wavesurfer || !wavesurfer.setOptions) {
            return;
        }
        wavesurfer.setOptions({ interact: interactive });
    }, [interactive]);

    useLayoutEffect(() => {
        if (mediaEl && !mediaEl.paused) {
            updatePlayheadPosition(mediaEl.currentTime);
            return;
        }
        updatePlayheadPosition(currentTime);
    }, [currentTime, durationSec, mediaEl, updatePlayheadPosition]);

    useEffect(() => {
        const media = mediaEl;
        if (!media) {
            return undefined;
        }

        const tick = (): void => {
            if (!media.paused) {
                updatePlayheadPosition(media.currentTime);
            }
            playheadRafRef.current = window.requestAnimationFrame(tick);
        };

        const startLoop = (): void => {
            window.cancelAnimationFrame(playheadRafRef.current);
            playheadRafRef.current = window.requestAnimationFrame(tick);
        };

        const stopLoop = (): void => {
            window.cancelAnimationFrame(playheadRafRef.current);
            updatePlayheadPosition(media.currentTime);
        };

        const handleSeeked = (): void => {
            updatePlayheadPosition(media.currentTime);
        };

        if (!media.paused) {
            startLoop();
        }

        media.addEventListener('play', startLoop);
        media.addEventListener('pause', stopLoop);
        media.addEventListener('seeked', handleSeeked);

        return () => {
            window.cancelAnimationFrame(playheadRafRef.current);
            media.removeEventListener('play', startLoop);
            media.removeEventListener('pause', stopLoop);
            media.removeEventListener('seeked', handleSeeked);
        };
    }, [mediaEl, updatePlayheadPosition]);

    useEffect(() => {
        const wavesurfer = wavesurferRef.current;
        if (!wavesurfer || !wavesurfer.setOptions || !(durationSec > 0)) {
            return undefined;
        }

        const fromPeaks = displayedPeaksRef.current;
        const reduceMotion =
            typeof window !== 'undefined' &&
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        window.cancelAnimationFrame(peakTransitionRafRef.current);

        if (!fromPeaks || fromPeaks === peaks || reduceMotion) {
            displayedPeaksRef.current = peaks;
            applyPeaks(wavesurfer, peaks, durationSec);
            return undefined;
        }

        const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const tick = (now: number): void => {
            const elapsedMs = now - start;
            const framePeaks = morphPeaks(fromPeaks, peaks, elapsedMs);
            displayedPeaksRef.current = framePeaks;
            applyPeaks(wavesurfer, framePeaks, durationSec);
            if (elapsedMs < WAVEFORM_PEAK_TRANSITION_MS) {
                peakTransitionRafRef.current = window.requestAnimationFrame(tick);
            } else {
                displayedPeaksRef.current = peaks;
            }
        };
        peakTransitionRafRef.current = window.requestAnimationFrame(tick);

        return () => window.cancelAnimationFrame(peakTransitionRafRef.current);
    }, [durationSec, peaks]);

    useEffect(() => {
        const wavesurfer = wavesurferRef.current;
        if (!wavesurfer || !wavesurfer.setOptions) {
            return;
        }

        const fills = getWaveformFills({ bufferProgress, hoverProgress });
        wavesurfer.setOptions({
            progressColor: toCanvasFill(fills.progressColor, fillWidth(containerRef.current)),
            waveColor: toCanvasFill(fills.waveColor, fillWidth(containerRef.current)),
        });
        wavesurfer.setTime(currentTimeRef.current);
    }, [bufferProgress, hoverProgress]);

    const onHoverMove = useCallback(
        (event: React.MouseEvent<HTMLDivElement>) => {
            if (!interactive) {
                return;
            }
            const rect = event.currentTarget.getBoundingClientRect();
            if (!(rect.width > 0) || !(durationSec > 0)) {
                return;
            }
            const x = event.clientX - rect.left;
            if (!Number.isFinite(x)) {
                return;
            }
            setHoverProgress(Math.min(1, Math.max(0, x / rect.width)));
        },
        [durationSec, interactive],
    );

    const onHoverLeave = useCallback(() => {
        setHoverProgress(null);
    }, []);

    const hoverLeft = hoverProgress == null ? null : `${hoverProgress * 100}%`;

    return (
        <div
            className={`bp-WaveformView${interactive ? '' : ' bp-WaveformView--inert'}`}
            data-testid="bp-waveform-view"
        >
            <div
                className="bp-WaveformView-track"
                onMouseLeave={interactive ? onHoverLeave : undefined}
                onMouseMove={interactive ? onHoverMove : undefined}
            >
                <div ref={containerRef} className="bp-WaveformView-canvas" />
                <div
                    ref={playheadRef}
                    aria-hidden="true"
                    className="bp-WaveformView-playhead"
                    data-testid="bp-waveform-playhead"
                />
                {hoverLeft != null && hoverProgress != null && (
                    <div className="bp-WaveformView-hover" data-testid="bp-waveform-hover" style={{ left: hoverLeft }}>
                        <div className="bp-WaveformView-hoverTime" data-testid="bp-waveform-hover-time">
                            {formatTime(hoverProgress * durationSec)}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
