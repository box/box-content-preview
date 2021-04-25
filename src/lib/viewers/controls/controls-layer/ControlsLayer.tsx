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
    forceShow?: boolean;
    onMount?: (helpers: Helpers) => void;
};

export const HIDE_DELAY_MS = 2000;
export const SHOW_CLASSNAME = 'bp-is-visible';

export default function ControlsLayer({ children, forceShow = false, onMount = noop }: Props): JSX.Element {
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
            }, HIDE_DELAY_MS);
        },
        reset() {
            hasCursorRef.current = false;
            hasFocusRef.current = false;
        },
        show() {
            helpersRef.current.clean();
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

    // Hides control layer when forceShow changes to false
    React.useEffect(() => {
        helpersRef.current.reset();

        if (!forceShow) {
            helpersRef.current.hide();
        }
    }, [forceShow]);

    // Destroy timeouts on unmount
    React.useEffect(() => helpersRef.current.clean, []);

    return (
        <div
            className={`bp-ControlsLayer ${isShown || forceShow ? SHOW_CLASSNAME : ''}`}
            onBlur={handleFocusOut}
            onFocus={handleFocusIn}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {children}
        </div>
    );
}
