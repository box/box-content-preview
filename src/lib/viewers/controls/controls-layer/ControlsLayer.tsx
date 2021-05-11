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

    const handleMouseLeave = (): void => {
        hasCursorRef.current = false;
        helpersRef.current.hide();
    };

    // Expose helpers to parent
    React.useEffect(() => {
        onMount(helpersRef.current);
    }, [onMount]);

    // Destroy timeouts on unmount
    React.useEffect(() => helpersRef.current.clean, []);

    return (
        <ControlsLayerContext.Provider
            value={{
                setIsForced: (value): void => {
                    helpersRef.current.reset();
                    setIsForced(value);
                },
            }}
        >
            <div
                className={`bp-ControlsLayer ${isShown || isForced ? SHOW_CLASSNAME : ''}`}
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
