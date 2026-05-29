import * as React from 'react';
import { ViewerError, ViewerLifecycleHandlers } from '../../../../types/viewer';

export interface UseViewerBaseResult {
    containerRef: React.RefObject<HTMLDivElement>;
    isFullscreen: boolean;
    error: ViewerError | null;
    setError: (error: ViewerError | null) => void;
    requestFullscreen: () => Promise<void>;
    exitFullscreen: () => Promise<void>;
    toggleFullscreen: () => Promise<void>;
}

export default function useViewerBase(handlers: ViewerLifecycleHandlers = {}): UseViewerBaseResult {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = React.useState(false);
    const [error, setErrorState] = React.useState<ViewerError | null>(null);

    const onErrorRef = React.useRef(handlers.onError);
    React.useEffect(() => {
        onErrorRef.current = handlers.onError;
    }, [handlers.onError]);

    const setError = React.useCallback((next: ViewerError | null) => {
        setErrorState(next);
        if (next) onErrorRef.current?.(next);
    }, []);

    React.useEffect(() => {
        const handleChange = (): void => {
            setIsFullscreen(Boolean(document.fullscreenElement));
        };
        document.addEventListener('fullscreenchange', handleChange);
        return () => document.removeEventListener('fullscreenchange', handleChange);
    }, []);

    const requestFullscreen = React.useCallback(async (): Promise<void> => {
        const el = containerRef.current;
        if (!el || document.fullscreenElement) return;
        await el.requestFullscreen();
    }, []);

    const exitFullscreen = React.useCallback(async (): Promise<void> => {
        if (!document.fullscreenElement) return;
        await document.exitFullscreen();
    }, []);

    const toggleFullscreen = React.useCallback(async (): Promise<void> => {
        if (document.fullscreenElement) {
            await document.exitFullscreen();
        } else if (containerRef.current) {
            await containerRef.current.requestFullscreen();
        }
    }, []);

    return {
        containerRef,
        isFullscreen,
        error,
        setError,
        requestFullscreen,
        exitFullscreen,
        toggleFullscreen,
    };
}
