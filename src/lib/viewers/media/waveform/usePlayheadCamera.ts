import { MutableRefObject, RefObject, useCallback, useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { getCurrentTimeMs } from '../../../util';
import { WAVEFORM_FOLLOW_SCROLL_SETTLE_MS, WAVEFORM_PLAYHEAD_JUMP_MS, WAVEFORM_ZOOM_MIN } from './constants';
import { WaveformViewport } from './types';
import {
    getFollowInsetPx,
    getPinnedPlayheadLeft,
    getPlayheadCameraAction,
    getViewportAtScroll,
    positionPxFromTime,
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
    mediaElRef: MutableRefObject<HTMLMediaElement | null | undefined>;
    onViewportCommit: (scrollLeftPx: number, viewport: WaveformViewport) => void;
    playheadRef: RefObject<HTMLDivElement | null>;
    viewportRef: MutableRefObject<WaveformViewport>;
    wavesurferRef: MutableRefObject<WaveSurfer | null>;
};

/**
 * Pin/follow vs user pan. Refs, not state: rAF and WaveSurfer `scroll` read these
 * every frame. WaveformView owns WaveSurfer, zoom, and the media rAF loop.
 */
export default function usePlayheadCamera({
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
    releaseUserPanHold: () => void;
    shouldFreezeViewport: () => boolean;
} {
    const onViewportCommitRef = useRef(onViewportCommit);
    onViewportCommitRef.current = onViewportCommit;

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
    const shouldFreezeViewport = useCallback(
        (): boolean => isFollowPinnedRef.current || jumpAnimationRef.current !== 0,
        [],
    );

    const cancelJump = useCallback((): void => {
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
            if (shouldCommitState) {
                onViewportCommitRef.current(appliedScrollLeft, viewportRef.current);
            }
        },
        [viewportRef, wavesurferRef],
    );

    const pinFollowPlayhead = useCallback(
        (playhead: HTMLElement | null, viewport: WaveformViewport, isPinned: boolean): void => {
            isFollowPinnedRef.current = isPinned;
            if (!playhead || !isPinned || !(viewport.widthPx > 0)) {
                return;
            }
            playhead.style.left = getPinnedPlayheadLeft(viewport.widthPx);
        },
        [],
    );

    const apply = useCallback(
        (timeSec: number, playJustStarted = false): void => {
            mediaTimeRef.current = timeSec;
            const wavesurfer = wavesurferRef.current;
            const viewport = viewportRef.current;
            if (!wavesurfer || viewport.zoomLevel <= WAVEFORM_ZOOM_MIN) {
                return;
            }
            if (userIsScrollingRef.current && !playJustStarted) {
                return;
            }
            if (jumpAnimationRef.current && !playJustStarted) {
                return;
            }

            const liveViewport = getViewportAtScroll(viewport, getScrollLeft(wavesurfer, viewport.scrollLeftPx));
            if (holdFollowUntilInsetRef.current && !playJustStarted) {
                const followX = liveViewport.widthPx - getFollowInsetPx(liveViewport.widthPx);
                const viewX = positionPxFromTime(timeSec, liveViewport);
                if (viewX >= followX) {
                    return;
                }
                holdFollowUntilInsetRef.current = false;
            }

            const action = getPlayheadCameraAction({
                isPlaying: true,
                playJustStarted,
                timeSec,
                viewport: liveViewport,
            });
            if (action.kind === 'none') {
                if (isFollowPinnedRef.current) {
                    isFollowPinnedRef.current = false;
                    applyScrollLeft(liveViewport.scrollLeftPx, true);
                }
                programmaticScrollRef.current = false;
                return;
            }

            cancelJump();
            if (action.kind === 'followRight') {
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
                    isPlaying: true,
                    playJustStarted: true,
                    timeSec: mediaTimeRef.current,
                    viewport: getViewportAtScroll(viewportRef.current, getScrollLeft(wavesurfer, from)),
                });
                const to = liveAction.kind === 'none' ? action.scrollLeftPx : liveAction.scrollLeftPx;
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
        [applyScrollLeft, cancelJump, pinFollowPlayhead, playheadRef, viewportRef, wavesurferRef],
    );
    applyRef.current = apply;

    const handleScroll = useCallback(
        (onUserPan: (mediaTimeSec: number) => void): void => {
            const wavesurfer = wavesurferRef.current;
            if (!wavesurfer) {
                return;
            }
            const scrollLeftPx = getScrollLeft(wavesurfer);
            const isCameraOwnedScroll = programmaticScrollRef.current || jumpAnimationRef.current !== 0;
            const lastCameraScroll = lastCameraScrollRef.current;
            const isFollowCameraScroll =
                isFollowPinnedRef.current && lastCameraScroll != null && Math.abs(scrollLeftPx - lastCameraScroll) <= 1;
            // Jump, matching follow scroll, or unpinned programmatic → ours.
            // Pinned + scroll ≠ lastCamera → user pan (programmatic stays true while pinned).
            if (
                isCameraOwnedScroll &&
                (jumpAnimationRef.current !== 0 || isFollowCameraScroll || !isFollowPinnedRef.current)
            ) {
                viewportRef.current = getViewportAtScroll(viewportRef.current, scrollLeftPx);
                return;
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
                applyRef.current?.(mediaTimeRef.current, false);
            }, WAVEFORM_FOLLOW_SCROLL_SETTLE_MS);
            cancelJump();
            isFollowPinnedRef.current = false;
            programmaticScrollRef.current = false;
            onUserPan(mediaTimeRef.current);
        },
        [cancelJump, mediaElRef, viewportRef, wavesurferRef],
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
        releaseUserPanHold,
        shouldFreezeViewport,
    };
}
