import { WAVEFORM_MIN_VIEW_WINDOW_SEC, WAVEFORM_ZOOM_MAX } from '../constants';
import {
    clampWaveformZoom,
    createWaveformViewport,
    getWaveformZoomMax,
    getZoomedPixelsPerSecond,
    isTimeInView,
    positionPxFromTime,
    sliderValueFromZoom,
    timeFromPositionPx,
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
});
