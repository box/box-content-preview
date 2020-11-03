import React from 'react';
import noop from 'lodash/noop';
import './ControlsLayer.scss';

export type Helpers = {
    hide: () => void;
    reset: () => void;
    show: () => void;
};

export type Props = {
    children: React.ReactNode;
    onMount?: (helpers: Helpers) => void;
};

export const HIDE_CLASSNAME = 'bp-is-visible';
export const HIDE_DELAY_MS = 2000;

export default function ControlsLayer({ children, onMount = noop }: Props): JSX.Element {
    const [isShown, setIsShown] = React.useState(false);
    const hasFocusRef = React.useRef(false);
    const hasCursorRef = React.useRef(false);
    const hideTimeoutRef = React.useRef<number>();

    // Visibility helpers
    const helpersRef = React.useRef({
        hide() {
            window.clearTimeout(hideTimeoutRef.current);

            hideTimeoutRef.current = window.setTimeout(() => {
                if (hasCursorRef.current || hasFocusRef.current) {
                    return;
                }

                setIsShown(false);
            }, HIDE_DELAY_MS);
        },
        reset() {
            hasCursorRef.current = false;
            hasFocusRef.current = false;
        },
        show() {
            window.clearTimeout(hideTimeoutRef.current);
            setIsShown(true);
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

    return (
        <div
            className={`bp-ControlsLayer ${isShown ? HIDE_CLASSNAME : ''}`}
            onBlur={handleFocusOut}
            onFocus={handleFocusIn}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {children}
        </div>
    );
}
