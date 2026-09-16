import { MutableRefObject, RefObject, useCallback, useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { getCurrentTimeMs } from '../../../util';
import { WAVEFORM_FOLLOW_SCROLL_SETTLE_MS, WAVEFORM_PLAYHEAD_JUMP_MS, WAVEFORM_ZOOM_MIN } from './constants';
import { PlayheadCameraMode, WaveformViewport } from './types';
import {
    getPinnedPlayheadLeft,
    getPlayheadCameraAction,
    getSeekCameraAction,
    getTapePinnedPlayheadLeft,
    getViewportAtScroll,
    maxScrollLeft,
    timeFromPositionPx,
    timeLeftPercent,
} from './viewport';

function getScrollLeft(wavesurfer: WaveSurfer | null, fallback = 0): number {
    return wavesurfer && wavesurfer.getScroll ? wavesurfer.getScroll() : fallback;
}

function prefersReducedMotion(): boolean {
    return (
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
}

export type UsePlayheadCameraOptions = {
    cameraMode?: PlayheadCameraMode;
    mediaElRef: MutableRefObject<HTMLMediaElement | null | undefined>;
    onViewportCommit: (scrollLeftPx: number, viewport: WaveformViewport, commitReactState?: boolean) => void;
    playheadRef: RefObject<HTMLDivElement | null>;
    viewportRef: MutableRefObject<WaveformViewport>;
    wavesurferRef: MutableRefObject<WaveSurfer | null>;
};

/**
 * Pin/follow vs user pan. Refs, not state: rAF and WaveSurfer `scroll` read these
 * every frame. WaveformView owns WaveSurfer, zoom, and the media rAF loop.
 */
export default function usePlayheadCamera({
    cameraMode = 'desktop',
    mediaElRef,
    onViewportCommit,
    playheadRef,
    viewportRef,
    wavesurferRef,
}: UsePlayheadCameraOptions): {
    apply: (timeSec: number, playJustStarted?: boolean) => void;
    applyScrollLeft: (scrollLeftPx: number, shouldCommitState: boolean) => void;
    cancelJump: () => void;
    clearFollowPin: () => void;
    handleScroll: (onUserPan: (mediaTimeSec: number) => void) => void;
    isFollowPinned: () => boolean;
    isUserPanning: () => boolean;
    onSeek: (timeSec: number) => void;
    onZoom: () => void;
    releaseUserPanHold: () => void;
    seekTo: (timeSec: number) => void;
} {
    const onViewportCommitRef = useRef(onViewportCommit);
    onViewportCommitRef.current = onViewportCommit;
    const cameraModeRef = useRef(cameraMode);
    cameraModeRef.current = cameraMode;

    const programmaticScrollRef = useRef(false);
    const jumpAnimationRef = useRef(0);
    const lastCameraScrollRef = useRef<number | null>(null);
    const mediaTimeRef = useRef(0);
    const isFollowPinnedRef = useRef(false);
    const userIsScrollingRef = useRef(false);
    const holdFollowUntilInsetRef = useRef(false);
    const scrollSettleTimerRef = useRef(0);
    const applyRef = useRef<((timeSec: number, playJustStarted?: boolean) => void) | null>(null);

    const isFollowPinned = useCallback((): boolean => isFollowPinnedRef.current, []);
    const isUserPanning = useCallback((): boolean => userIsScrollingRef.current, []);
    const isTape = useCallback((): boolean => cameraModeRef.current === 'tape', []);

    const cancelJump = useCallback((): void => {
        if (!jumpAnimationRef.current) {
            return;
        }
        window.cancelAnimationFrame(jumpAnimationRef.current);
        jumpAnimationRef.current = 0;
    }, []);

    const clearFollowPin = useCallback((): void => {
        isFollowPinnedRef.current = false;
        programmaticScrollRef.current = false;
    }, []);

    const releaseUserPanHold = useCallback((): void => {
        window.clearTimeout(scrollSettleTimerRef.current);
        scrollSettleTimerRef.current = 0;
        userIsScrollingRef.current = false;
        holdFollowUntilInsetRef.current = false;
    }, []);

    const readMediaTime = useCallback((): number => {
        const live = mediaElRef.current?.currentTime;
        if (typeof live === 'number' && Number.isFinite(live)) {
            mediaTimeRef.current = live;
            return live;
        }
        return mediaTimeRef.current;
    }, [mediaElRef]);

    const onSeek = useCallback(
        (timeSec: number): void => {
            mediaTimeRef.current = timeSec;
            cancelJump();
            if (!isTape()) {
                clearFollowPin();
            }
        },
        [cancelJump, clearFollowPin, isTape],
    );

    /** Unpin and hold follow so zoom setScroll (slider center or pinch origin) is not stolen. */
    const onZoom = useCallback((): void => {
        cancelJump();
        if (isTape()) {
            isFollowPinnedRef.current = true;
            holdFollowUntilInsetRef.current = false;
            return;
        }
        isFollowPinnedRef.current = false;
        holdFollowUntilInsetRef.current = true;
    }, [cancelJump, isTape]);

    const applyScrollLeft = useCallback(
        (scrollLeftPx: number, shouldCommitState: boolean): void => {
            const wavesurfer = wavesurferRef.current;
            if (!wavesurfer || !wavesurfer.setScroll) {
                return;
            }
            programmaticScrollRef.current = true;
            lastCameraScrollRef.current = scrollLeftPx;
            wavesurfer.setScroll(scrollLeftPx);
            const appliedScrollLeft = getScrollLeft(wavesurfer, scrollLeftPx);
            lastCameraScrollRef.current = appliedScrollLeft;
            viewportRef.current = getViewportAtScroll(viewportRef.current, appliedScrollLeft);
            window.requestAnimationFrame(() => {
                // Keep the flag through delayed `scroll` while the camera is driving.
                if (jumpAnimationRef.current || isFollowPinnedRef.current) {
                    return;
                }
                programmaticScrollRef.current = false;
            });
            // Overlay always gets the live window. React scroll state only when not pinned,
            // so WaveformView does not re-render every follow frame.
            onViewportCommitRef.current(appliedScrollLeft, viewportRef.current, shouldCommitState);
        },
        [viewportRef, wavesurferRef],
    );

    const pinFollowPlayhead = useCallback(
        (playhead: HTMLElement | null, viewport: WaveformViewport, isPinned: boolean): void => {
            isFollowPinnedRef.current = isPinned;
            if (!playhead || !isPinned || !(viewport.widthPx > 0)) {
                return;
            }
            playhead.style.left = isTape() ? getTapePinnedPlayheadLeft() : getPinnedPlayheadLeft(viewport.widthPx);
        },
        [isTape],
    );

    const apply = useCallback(
        (timeSec: number, playJustStarted = false): void => {
            mediaTimeRef.current = timeSec;
            const wavesurfer = wavesurferRef.current;
            const viewport = viewportRef.current;
            if (!wavesurfer) {
                return;
            }
            if (!isTape() && viewport.zoomLevel <= WAVEFORM_ZOOM_MIN) {
                clearFollowPin();
                return;
            }
            if (userIsScrollingRef.current && !playJustStarted) {
                return;
            }
            if (jumpAnimationRef.current && !playJustStarted) {
                return;
            }

            const liveViewport = getViewportAtScroll(viewport, getScrollLeft(wavesurfer, viewport.scrollLeftPx));
            const action = getPlayheadCameraAction({
                cameraMode: cameraModeRef.current,
                isPlaying: true,
                playJustStarted,
                timeSec,
                viewport: liveViewport,
            });
            if (!isTape() && holdFollowUntilInsetRef.current && !playJustStarted) {
                if (action.type !== 'none') {
                    return;
                }
                holdFollowUntilInsetRef.current = false;
            }

            if (action.type === 'none') {
                if (isFollowPinnedRef.current) {
                    isFollowPinnedRef.current = false;
                    applyScrollLeft(liveViewport.scrollLeftPx, true);
                }
                programmaticScrollRef.current = false;
                return;
            }

            cancelJump();
            if (action.type === 'followRight') {
                pinFollowPlayhead(playheadRef.current, liveViewport, action.isPlayheadPinned);
                applyScrollLeft(action.scrollLeftPx, !action.isPlayheadPinned);
                return;
            }

            isFollowPinnedRef.current = false;
            const from = getScrollLeft(wavesurfer, liveViewport.scrollLeftPx);
            if (prefersReducedMotion() || typeof window.requestAnimationFrame !== 'function') {
                applyScrollLeft(action.scrollLeftPx, true);
                apply(timeSec, false);
                return;
            }

            programmaticScrollRef.current = true;
            const start = getCurrentTimeMs();
            const tick = (now: number): void => {
                const t = Math.min(1, (now - start) / WAVEFORM_PLAYHEAD_JUMP_MS);
                const liveAction = getPlayheadCameraAction({
                    cameraMode: cameraModeRef.current,
                    isPlaying: true,
                    playJustStarted: true,
                    timeSec: mediaTimeRef.current,
                    viewport: getViewportAtScroll(viewportRef.current, getScrollLeft(wavesurfer, from)),
                });
                const to = liveAction.type === 'none' ? action.scrollLeftPx : liveAction.scrollLeftPx;
                applyScrollLeft(from + (to - from) * (1 - (1 - t) * (1 - t)), false);
                if (t < 1) {
                    jumpAnimationRef.current = window.requestAnimationFrame(tick);
                    return;
                }
                jumpAnimationRef.current = 0;
                applyScrollLeft(to, true);
                apply(mediaTimeRef.current, false);
            };
            jumpAnimationRef.current = window.requestAnimationFrame(tick);
        },
        [
            applyScrollLeft,
            cancelJump,
            clearFollowPin,
            isTape,
            pinFollowPlayhead,
            playheadRef,
            viewportRef,
            wavesurferRef,
        ],
    );
    applyRef.current = apply;

    /**
     * Camera-owned: jumping; matching follow scroll; unpinned programmatic; clamp-to-max.
     * User pan: pinned and |scroll - lastCamera| > 1, or any non-programmatic scroll while not jumping.
     */
    const isUserPan = useCallback(
        (scrollLeftPx: number): boolean => {
            const isCameraOwnedScroll = programmaticScrollRef.current || jumpAnimationRef.current !== 0;
            const lastCameraScroll = lastCameraScrollRef.current;
            const maxScroll = maxScrollLeft(viewportRef.current);
            const isClampedToMax =
                lastCameraScroll != null && scrollLeftPx >= maxScroll - 1 && lastCameraScroll >= maxScroll - 1;
            const isFollowCameraScroll =
                isFollowPinnedRef.current && lastCameraScroll != null && Math.abs(scrollLeftPx - lastCameraScroll) <= 1;
            return !(
                isCameraOwnedScroll &&
                (jumpAnimationRef.current !== 0 || isFollowCameraScroll || isClampedToMax || !isFollowPinnedRef.current)
            );
        },
        [viewportRef],
    );

    const seekTo = useCallback(
        (timeSec: number): void => {
            mediaTimeRef.current = timeSec;
            const wavesurfer = wavesurferRef.current;
            if (!wavesurfer) {
                return;
            }

            releaseUserPanHold();
            cancelJump();
            if (!isTape()) {
                isFollowPinnedRef.current = false;
            }

            const liveViewport = getViewportAtScroll(
                viewportRef.current,
                getScrollLeft(wavesurfer, viewportRef.current.scrollLeftPx),
            );
            const action = getSeekCameraAction({
                cameraMode: cameraModeRef.current,
                timeSec,
                viewport: liveViewport,
            });
            if (action.type !== 'jump') {
                return;
            }

            const from = liveViewport.scrollLeftPx;
            const to = action.scrollLeftPx;
            if (prefersReducedMotion() || typeof window.requestAnimationFrame !== 'function' || from === to) {
                applyScrollLeft(to, true);
                return;
            }

            programmaticScrollRef.current = true;
            const start = getCurrentTimeMs();
            const tick = (now: number): void => {
                const t = Math.min(1, (now - start) / WAVEFORM_PLAYHEAD_JUMP_MS);
                applyScrollLeft(from + (to - from) * (1 - (1 - t) * (1 - t)), false);
                const playhead = playheadRef.current;
                if (playhead) {
                    playhead.style.left = isTape()
                        ? getTapePinnedPlayheadLeft()
                        : timeLeftPercent(mediaTimeRef.current, viewportRef.current.durationSec, viewportRef.current);
                }
                if (t < 1) {
                    jumpAnimationRef.current = window.requestAnimationFrame(tick);
                    return;
                }
                jumpAnimationRef.current = 0;
                applyScrollLeft(to, true);
            };
            jumpAnimationRef.current = window.requestAnimationFrame(tick);
        },
        [applyScrollLeft, cancelJump, isTape, playheadRef, releaseUserPanHold, viewportRef, wavesurferRef],
    );

    const handleScroll = useCallback(
        (onUserPan: (mediaTimeSec: number) => void): void => {
            const wavesurfer = wavesurferRef.current;
            if (!wavesurfer) {
                return;
            }
            const scrollLeftPx = getScrollLeft(wavesurfer);
            if (!isUserPan(scrollLeftPx)) {
                viewportRef.current = getViewportAtScroll(viewportRef.current, scrollLeftPx);
                return;
            }

            viewportRef.current = getViewportAtScroll(viewportRef.current, scrollLeftPx);
            const playhead = playheadRef.current;
            if (isTape()) {
                if (playhead) {
                    playhead.style.left = getTapePinnedPlayheadLeft();
                }
                const pinTimeSec = Math.min(
                    viewportRef.current.durationSec,
                    Math.max(0, timeFromPositionPx(viewportRef.current.widthPx / 2, viewportRef.current)),
                );
                userIsScrollingRef.current = true;
                window.clearTimeout(scrollSettleTimerRef.current);
                scrollSettleTimerRef.current = window.setTimeout(() => {
                    userIsScrollingRef.current = false;
                    scrollSettleTimerRef.current = 0;
                    if (!mediaElRef.current || mediaElRef.current.paused) {
                        return;
                    }
                    applyRef.current?.(readMediaTime(), false);
                }, WAVEFORM_FOLLOW_SCROLL_SETTLE_MS);
                cancelJump();
                programmaticScrollRef.current = false;
                onUserPan(pinTimeSec);
                return;
            }

            const timeSec = readMediaTime();
            if (playhead) {
                playhead.style.left = timeLeftPercent(timeSec, viewportRef.current.durationSec, viewportRef.current);
            }

            userIsScrollingRef.current = true;
            holdFollowUntilInsetRef.current = true;
            window.clearTimeout(scrollSettleTimerRef.current);
            scrollSettleTimerRef.current = window.setTimeout(() => {
                userIsScrollingRef.current = false;
                scrollSettleTimerRef.current = 0;
                if (!mediaElRef.current || mediaElRef.current.paused) {
                    return;
                }
                applyRef.current?.(readMediaTime(), false);
            }, WAVEFORM_FOLLOW_SCROLL_SETTLE_MS);
            cancelJump();
            isFollowPinnedRef.current = false;
            programmaticScrollRef.current = false;
            onUserPan(timeSec);
        },
        [cancelJump, isTape, isUserPan, mediaElRef, playheadRef, readMediaTime, viewportRef, wavesurferRef],
    );

    useEffect(
        () => () => {
            releaseUserPanHold();
            cancelJump();
        },
        [cancelJump, releaseUserPanHold],
    );

    return {
        apply,
        applyScrollLeft,
        cancelJump,
        clearFollowPin,
        handleScroll,
        isFollowPinned,
        isUserPanning,
        onSeek,
        onZoom,
        releaseUserPanHold,
        seekTo,
    };
}
