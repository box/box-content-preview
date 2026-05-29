import * as React from 'react';
import { act, render } from '@testing-library/react';
import useImageZoomPan, { UseImageZoomPanResult } from '../useImageZoomPan';

function Harness({ onReady }: { onReady: (api: UseImageZoomPanResult) => void }): React.ReactElement {
    const api = useImageZoomPan();
    React.useEffect(() => {
        onReady(api);
    });
    return <div ref={api.bindContainer} />;
}

describe('useImageZoomPan', () => {
    let api: UseImageZoomPanResult;
    const setApi = (next: UseImageZoomPanResult): void => {
        api = next;
    };

    beforeEach(() => {
        render(<Harness onReady={setApi} />);
    });

    test('starts at zoom 1, rotation 0, no pan', () => {
        expect(api.zoom).toBe(1);
        expect(api.rotation).toBe(0);
        expect(api.panX).toBe(0);
        expect(api.panY).toBe(0);
    });

    test('zoomIn increases zoom by step', () => {
        act(() => api.zoomIn());
        expect(api.zoom).toBeGreaterThan(1);
    });

    test('zoomOut decreases zoom by step', () => {
        act(() => api.zoomIn());
        act(() => api.zoomOut());
        expect(api.zoom).toBeCloseTo(1);
    });

    test('clamps zoom to MAX_ZOOM=10', () => {
        act(() => {
            for (let i = 0; i < 50; i += 1) api.zoomIn();
        });
        expect(api.zoom).toBeLessThanOrEqual(10);
    });

    test('clamps zoom to MIN_ZOOM=0.1', () => {
        act(() => {
            for (let i = 0; i < 50; i += 1) api.zoomOut();
        });
        expect(api.zoom).toBeGreaterThanOrEqual(0.1);
    });

    test('rotateLeft decrements rotation by 90 degrees', () => {
        act(() => api.rotateLeft());
        expect(api.rotation).toBe(-90);
    });

    test('fit resets zoom and pan', () => {
        act(() => api.zoomIn());
        act(() => api.fit());
        expect(api.zoom).toBe(1);
        expect(api.panX).toBe(0);
    });

    test('isPannable becomes true once zoomed in', () => {
        expect(api.isPannable).toBe(false);
        act(() => api.zoomIn());
        expect(api.isPannable).toBe(true);
    });
});
