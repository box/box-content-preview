import React from 'react';
import noop from 'lodash/noop';
import ControlsLayerContext from './ControlsLayerContext';
import './ControlsLayer.scss';

export type Helpers = {
    hide: () => void;
    reset: () => void;
    show: () => void;
};

export type Props = {
    children: React.ReactNode;
    onHide?: () => void;
    onMount?: (helpers: Helpers) => void;
    onShow?: () => void;
};

export const HIDE_DELAY_MS = 2000;
export const SHOW_CLASSNAME = 'bp-is-visible';

export default function ControlsLayer({ children, onHide = noop, onMount = noop, onShow = noop }: Props): JSX.Element {
    const [isForced, setIsForced] = React.useState(false);
    const [isShown, setIsShown] = React.useState(false);
    const hasFocusRef = React.useRef(false);
    const hasCursorRef = React.useRef(false);
    const hideTimeoutRef = React.useRef<number>();

    // Visibility helpers
    const helpersRef = React.useRef({
        clean() {
            window.clearTimeout(hideTimeoutRef.current);
        },
        hide() {
            helpersRef.current.clean();

            hideTimeoutRef.current = window.setTimeout(() => {
                if (hasCursorRef.current || hasFocusRef.current) {
                    return;
                }

                setIsShown(false);
                onHide();
            }, HIDE_DELAY_MS);
        },
        reset() {
            hasCursorRef.current = false;
            hasFocusRef.current = false;
        },
        show() {
            helpersRef.current.clean();
            setIsShown(true);
            onShow();
        },
    });

    // Event handlers
    const handleFocusIn = (): void => {
        hasFocusRef.current = true;
        helpersRef.current.show();
    };

    const handleFocusOut = (): void => {
        hasFocusRef.current = false;
        helpersRef.current.hide();
    };

    const handleMouseEnter = (): void => {
        hasCursorRef.current = true;
        helpersRef.current.show();
    };

    const handleMouseLeave = (event: React.MouseEvent): void => {
        hasCursorRef.current = false;

        const layerEl = event.currentTarget as HTMLElement;
        if (document.activeElement && layerEl.contains(document.activeElement)) {
            (document.activeElement as HTMLElement).blur();
        }

        helpersRef.current.hide();
    };

    // Expose helpers to parent
    React.useEffect(() => {
        onMount(helpersRef.current);
    }, [onMount]);

    // Destroy timeouts on unmount
    React.useEffect(() => helpersRef.current.clean, []);

    // Keep a stable identity so consumers can safely depend on it (e.g. ColorPickerControl pins the layer
    // from an effect keyed on this function). An inline value here handed down a fresh function every render,
    // which retriggered that effect's cleanup and instantly un-pinned the layer — the palette faded out the
    // moment the cursor left it.
    const setIsForcedWithReset = React.useCallback((value: boolean): void => {
        helpersRef.current.reset();
        setIsForced(value);
    }, []);
    const contextValue = React.useMemo(() => ({ setIsForced: setIsForcedWithReset }), [setIsForcedWithReset]);

    return (
        <ControlsLayerContext.Provider value={contextValue}>
            <div
                className={`bp-ControlsLayer ${isShown || isForced ? SHOW_CLASSNAME : ''}`}
                data-testid="bp-ControlsLayer"
                onBlur={handleFocusOut}
                onFocus={handleFocusIn}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {children}
            </div>
        </ControlsLayerContext.Provider>
    );
}
