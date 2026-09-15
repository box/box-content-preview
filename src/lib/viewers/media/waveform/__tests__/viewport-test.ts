import { WAVEFORM_MIN_VIEW_WINDOW_SEC, WAVEFORM_TAPE_DEFAULT_WINDOW_SEC, WAVEFORM_ZOOM_MAX } from '../constants';
import {
    clampWaveformZoom,
    createWaveformViewport,
    getPinnedPlayheadLeft,
    getPlayheadCameraAction,
    getSeekCameraAction,
    getTapeCameraAction,
    getTapeDefaultZoom,
    getTapeGutterPx,
    getTapePinnedPlayheadLeft,
    getWaveformZoomMax,
    getZoomedPixelsPerSecond,
    isTimeInView,
    maxScrollLeft,
    positionPxFromTime,
    sliderValueFromZoom,
    timeFromPositionPx,
    timeLeftPercent,
    viewportEquals,
    zoomFromSliderValue,
} from '../viewport';

describe('viewport', () => {
    const overview = createWaveformViewport({
        durationSec: 8,
        heightPx: 140,
        maxZoom: 4,
        scrollLeftPx: 0,
        widthPx: 200,
        zoomLevel: 1,
    });

    test('should treat matching visible-window fields as equal', () => {
        expect(viewportEquals(overview, { ...overview })).toBe(true);
        expect(viewportEquals(null, overview)).toBe(false);
        expect(viewportEquals(overview, { ...overview, scrollLeftPx: 10 })).toBe(false);
        expect(viewportEquals(overview, { ...overview, zoomLevel: 2 })).toBe(false);
    });

    test('should map time to the full width at zoom 1', () => {
        expect(overview.startSec).toBe(0);
        expect(overview.endSec).toBe(8);
        expect(positionPxFromTime(2, overview)).toBe(50);
        expect(timeFromPositionPx(50, overview)).toBe(2);
        expect(isTimeInView(2, overview)).toBe(true);
    });

    test('should keep the time under the pointer after a scrolled zoom window', () => {
        const zoomed = createWaveformViewport({
            durationSec: 8,
            heightPx: 140,
            maxZoom: 4,
            scrollLeftPx: 200,
            widthPx: 200,
            zoomLevel: 2,
        });

        expect(zoomed.startSec).toBe(4);
        expect(zoomed.endSec).toBe(8);
        expect(positionPxFromTime(6, zoomed)).toBe(100);
        expect(timeFromPositionPx(100, zoomed)).toBe(6);
        expect(isTimeInView(2, zoomed)).toBe(false);
        expect(isTimeInView(6, zoomed)).toBe(true);
    });

    test('should not follow the playhead until it nears the right edge', () => {
        const zoomed = createWaveformViewport({
            durationSec: 8,
            heightPx: 140,
            maxZoom: 4,
            scrollLeftPx: 0,
            widthPx: 200,
            zoomLevel: 2,
        });

        expect(
            getPlayheadCameraAction({
                insetPx: 40,
                isPlaying: true,
                playJustStarted: false,
                timeSec: 1,
                viewport: zoomed,
            }),
        ).toEqual({ type: 'none' });

        const follow = getPlayheadCameraAction({
            insetPx: 40,
            isPlaying: true,
            playJustStarted: false,
            timeSec: 3.5,
            viewport: zoomed,
        });
        expect(follow.type).toBe('followRight');
        if (follow.type === 'followRight') {
            expect(follow.isPlayheadPinned).toBe(true);
            expect(follow.scrollLeftPx).toBeCloseTo(15);
        }

        const offRight = getPlayheadCameraAction({
            isPlaying: true,
            playJustStarted: false,
            timeSec: 10,
            viewport: createWaveformViewport({
                durationSec: 60,
                heightPx: 140,
                maxZoom: 15,
                scrollLeftPx: 0,
                widthPx: 800,
                zoomLevel: 15,
            }),
        });
        expect(offRight.type).toBe('followRight');
        if (offRight.type === 'followRight') {
            expect(offRight.isPlayheadPinned).toBe(true);
            expect(offRight.scrollLeftPx).toBeCloseTo(1400);
        }
    });

    test('should jump the playhead into view on the off-screen side when play starts', () => {
        const offRight = createWaveformViewport({
            durationSec: 8,
            heightPx: 140,
            maxZoom: 4,
            scrollLeftPx: 0,
            widthPx: 200,
            zoomLevel: 2,
        });
        const jumpRight = getPlayheadCameraAction({
            insetPx: 40,
            isPlaying: true,
            playJustStarted: true,
            timeSec: 6,
            viewport: offRight,
        });
        expect(jumpRight.type).toBe('jump');
        if (jumpRight.type === 'jump') {
            expect(jumpRight.scrollLeftPx).toBeCloseTo(140);
        }

        const offLeft = createWaveformViewport({
            durationSec: 8,
            heightPx: 140,
            maxZoom: 4,
            scrollLeftPx: 200,
            widthPx: 200,
            zoomLevel: 2,
        });
        const jumpLeft = getPlayheadCameraAction({
            insetPx: 40,
            isPlaying: true,
            playJustStarted: true,
            timeSec: 1,
            viewport: offLeft,
        });
        expect(jumpLeft.type).toBe('jump');
        if (jumpLeft.type === 'jump') {
            expect(jumpLeft.scrollLeftPx).toBeCloseTo(10);
        }
    });

    test('should jump a host seek to center the time when it is off-screen while zoomed', () => {
        const zoomed = createWaveformViewport({
            durationSec: 8,
            heightPx: 140,
            maxZoom: 4,
            scrollLeftPx: 0,
            widthPx: 200,
            zoomLevel: 2,
        });

        expect(getSeekCameraAction({ timeSec: 2, viewport: zoomed })).toEqual({ type: 'none' });
        expect(getSeekCameraAction({ timeSec: 6, viewport: overview })).toEqual({ type: 'none' });

        const jumpRight = getSeekCameraAction({ timeSec: 6, viewport: zoomed });
        expect(jumpRight.type).toBe('jump');
        if (jumpRight.type === 'jump') {
            expect(jumpRight.scrollLeftPx).toBeCloseTo(200);
        }

        const offLeft = createWaveformViewport({
            durationSec: 8,
            heightPx: 140,
            maxZoom: 4,
            scrollLeftPx: 200,
            widthPx: 200,
            zoomLevel: 2,
        });
        const jumpLeft = getSeekCameraAction({ timeSec: 1, viewport: offLeft });
        expect(jumpLeft.type).toBe('jump');
        if (jumpLeft.type === 'jump') {
            expect(jumpLeft.scrollLeftPx).toBeCloseTo(0);
        }
    });

    test('should unpin the playhead when follow scroll hits the end of the file', () => {
        const zoomed = createWaveformViewport({
            durationSec: 8,
            heightPx: 140,
            maxZoom: 4,
            scrollLeftPx: 0,
            widthPx: 200,
            zoomLevel: 2,
        });
        const follow = getPlayheadCameraAction({
            insetPx: 40,
            isPlaying: true,
            playJustStarted: false,
            timeSec: 7.5,
            viewport: zoomed,
        });

        expect(follow.type).toBe('followRight');
        if (follow.type === 'followRight') {
            expect(follow.isPlayheadPinned).toBe(false);
            expect(follow.scrollLeftPx).toBe(200);
        }
    });

    test('should pin the playhead at the follow inset as a CSS percent', () => {
        expect(getPinnedPlayheadLeft(200)).toBe(`${((200 - 200 / 3) / 200) * 100}%`);
        expect(getPinnedPlayheadLeft(800)).toBe('75%');
        expect(getPinnedPlayheadLeft(0)).toBe('0%');
    });

    test('should place the playhead as a CSS percent of the visible window', () => {
        expect(timeLeftPercent(2, 8, overview)).toBe('25%');
        expect(timeLeftPercent(2, 8, createWaveformViewport({ ...overview, widthPx: 0 }))).toBe('25%');
    });

    test('should cap max zoom at 24x, by peak density, and by the minimum window', () => {
        const longFile = { durationSec: 3600, viewWidthPx: 800 };
        expect(getWaveformZoomMax({ ...longFile, peakCount: 2048 })).toBe(2);
        expect(getWaveformZoomMax({ ...longFile, peakCount: 16384 })).toBe(20);
        expect(getWaveformZoomMax({ ...longFile, peakCount: 24000 })).toBe(WAVEFORM_ZOOM_MAX);
        expect(getWaveformZoomMax({ durationSec: 3600, peakCount: 3600, viewWidthPx: 900 })).toBe(4);
        expect(getWaveformZoomMax({ durationSec: 3600, peakCount: 0, viewWidthPx: 800 })).toBe(1);

        expect(getWaveformZoomMax({ durationSec: 2, peakCount: 16384, viewWidthPx: 800 })).toBe(1);
        expect(
            getWaveformZoomMax({
                durationSec: WAVEFORM_MIN_VIEW_WINDOW_SEC,
                peakCount: 16384,
                viewWidthPx: 800,
            }),
        ).toBe(1);
        expect(getWaveformZoomMax({ durationSec: 10, peakCount: 16384, viewWidthPx: 800 })).toBeCloseTo(
            10 / WAVEFORM_MIN_VIEW_WINDOW_SEC,
        );
        expect(getWaveformZoomMax({ durationSec: 60, peakCount: 16384, viewWidthPx: 400 })).toBe(
            Math.min(WAVEFORM_ZOOM_MAX, Math.floor(16384 / 400), 60 / WAVEFORM_MIN_VIEW_WINDOW_SEC),
        );
        expect(getWaveformZoomMax({ durationSec: 60, peakCount: 16384, viewWidthPx: 800 })).toBe(
            Math.min(20, 60 / WAVEFORM_MIN_VIEW_WINDOW_SEC),
        );
        expect(getWaveformZoomMax({ durationSec: 300, peakCount: 16384, viewWidthPx: 800 })).toBe(20);
    });

    test('should clamp zoom to fit-to-width and the peak-derived max', () => {
        expect(clampWaveformZoom(0, 4)).toBe(1);
        expect(clampWaveformZoom(8, 4)).toBe(4);
        expect(clampWaveformZoom(2, 4)).toBe(2);
    });

    test('should use 0 px/sec at fit-to-width so wavesurfer fills the parent', () => {
        expect(getZoomedPixelsPerSecond({ durationSec: 10, maxZoom: 4, viewWidthPx: 900, zoomLevel: 1 })).toBe(0);
        expect(getZoomedPixelsPerSecond({ durationSec: 10, maxZoom: 4, viewWidthPx: 900, zoomLevel: 2 })).toBe(180);
        expect(getZoomedPixelsPerSecond({ durationSec: 10, maxZoom: 4, viewWidthPx: 900, zoomLevel: 4 })).toBe(360);
    });

    test('should round-trip slider values against the peak-derived max', () => {
        const maxZoom = 4;
        expect(zoomFromSliderValue(0, maxZoom)).toBe(1);
        expect(zoomFromSliderValue(100, maxZoom)).toBe(4);
        expect(sliderValueFromZoom(1, maxZoom)).toBe(0);
        expect(sliderValueFromZoom(4, maxZoom)).toBe(100);
        expect(zoomFromSliderValue(sliderValueFromZoom(2.5, maxZoom), maxZoom)).toBe(2.5);
    });

    test('should keep the slider at fit-to-width when zoom cannot exceed 1x', () => {
        expect(sliderValueFromZoom(1, 1)).toBe(0);
        expect(zoomFromSliderValue(100, 1)).toBe(1);
    });

    test('should add half-view gutters so t=0 sits at the center pin', () => {
        const tape = createWaveformViewport({
            durationSec: 8,
            gutterPx: 100,
            heightPx: 140,
            maxZoom: 4,
            scrollLeftPx: 0,
            widthPx: 200,
            zoomLevel: 1,
        });

        expect(tape.startSec).toBe(-4);
        expect(tape.endSec).toBe(4);
        expect(positionPxFromTime(0, tape)).toBe(100);
        expect(timeFromPositionPx(100, tape)).toBe(0);
        expect(timeLeftPercent(0, 8, tape)).toBe('50%');
        expect(maxScrollLeft(tape)).toBe(200);
        expect(getTapeGutterPx(200)).toBe(100);
        expect(getTapePinnedPlayheadLeft()).toBe('50%');
    });

    test('should keep the playhead centered while following in tape mode', () => {
        const tape = createWaveformViewport({
            durationSec: 8,
            gutterPx: 100,
            heightPx: 140,
            maxZoom: 4,
            scrollLeftPx: 0,
            widthPx: 200,
            zoomLevel: 1,
        });

        const follow = getPlayheadCameraAction({
            cameraMode: 'tape',
            isPlaying: true,
            playJustStarted: false,
            timeSec: 2,
            viewport: tape,
        });
        expect(follow).toEqual(getTapeCameraAction({ timeSec: 2, viewport: tape }));
        expect(follow.type).toBe('followRight');
        if (follow.type === 'followRight') {
            expect(follow.isPlayheadPinned).toBe(true);
            expect(follow.scrollLeftPx).toBeCloseTo(50);
        }

        const paused = getPlayheadCameraAction({
            cameraMode: 'tape',
            isPlaying: false,
            playJustStarted: false,
            timeSec: 0,
            viewport: tape,
        });
        expect(paused.type).toBe('followRight');
        if (paused.type === 'followRight') {
            expect(paused.scrollLeftPx).toBe(0);
        }
    });

    test('should jump a tape seek to the center pin even when the time is already on screen', () => {
        const tape = createWaveformViewport({
            durationSec: 8,
            gutterPx: 100,
            heightPx: 140,
            maxZoom: 4,
            scrollLeftPx: 0,
            widthPx: 200,
            zoomLevel: 1,
        });

        const jump = getSeekCameraAction({ cameraMode: 'tape', timeSec: 2, viewport: tape });
        expect(jump.type).toBe('jump');
        if (jump.type === 'jump') {
            expect(jump.scrollLeftPx).toBeCloseTo(50);
        }

        const centered = createWaveformViewport({ ...tape, scrollLeftPx: 50 });
        expect(getSeekCameraAction({ cameraMode: 'tape', timeSec: 2, viewport: centered })).toEqual({ type: 'none' });
    });

    test('should default tape zoom to a 10s window and still allow 1x', () => {
        expect(getTapeDefaultZoom(8, 24)).toBe(1);
        expect(getTapeDefaultZoom(100, 24)).toBe(100 / WAVEFORM_TAPE_DEFAULT_WINDOW_SEC);
        expect(getTapeDefaultZoom(100, 4)).toBe(4);
        expect(
            getZoomedPixelsPerSecond({ durationSec: 8, isTape: true, maxZoom: 4, viewWidthPx: 200, zoomLevel: 1 }),
        ).toBe(25);
        expect(getZoomedPixelsPerSecond({ durationSec: 8, maxZoom: 4, viewWidthPx: 200, zoomLevel: 1 })).toBe(0);
    });
});
