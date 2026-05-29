import * as React from 'react';
import { act, render } from '@testing-library/react';
import useViewerBase, { UseViewerBaseResult } from '../useViewerBase';
import { ViewerLifecycleHandlers } from '../../../../../types/viewer';

function Harness({
    handlers,
    onReady,
}: {
    handlers?: ViewerLifecycleHandlers;
    onReady: (api: UseViewerBaseResult) => void;
}): React.ReactElement {
    const api = useViewerBase(handlers);
    React.useEffect(() => {
        onReady(api);
    });
    return <div ref={api.containerRef} />;
}

describe('useViewerBase', () => {
    let api: UseViewerBaseResult;
    const setApi = (next: UseViewerBaseResult): void => {
        api = next;
    };

    test('exposes containerRef and starts not in fullscreen with no error', () => {
        render(<Harness onReady={setApi} />);
        expect(api.containerRef.current).not.toBeNull();
        expect(api.isFullscreen).toBe(false);
        expect(api.error).toBeNull();
    });

    test('setError invokes onError handler', () => {
        const onError = jest.fn();
        render(<Harness handlers={{ onError }} onReady={setApi} />);
        act(() => api.setError({ code: 'X', message: 'oops' }));
        expect(api.error).toEqual({ code: 'X', message: 'oops' });
        expect(onError).toHaveBeenCalledWith({ code: 'X', message: 'oops' });
    });
});
