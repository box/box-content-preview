import React from 'react';
import classNames from 'classnames';
import MediaSettingsContext, { Menu, Rect } from './MediaSettingsContext';
import MediaSettingsFlyout from './MediaSettingsFlyout';
import MediaSettingsToggle, { Ref as MediaSettingsToggleRef } from './MediaSettingsToggle';
import { decodeKeydown } from '../../../../util';

export type Props = React.PropsWithChildren<{
    className?: string;
}>;

export default function MediaSettingsControls({ children, className, ...rest }: Props): JSX.Element | null {
    const [activeMenu, setActiveMenu] = React.useState(Menu.MAIN);
    const [activeRect, setActiveRect] = React.useState<Rect>();
    const [isFocused, setIsFocused] = React.useState(false);
    const [isOpen, setIsOpen] = React.useState(false);
    const buttonElRef = React.useRef<MediaSettingsToggleRef>(null);
    const controlsElRef = React.useRef<HTMLDivElement>(null);
    const resetControls = React.useCallback(() => {
        setActiveMenu(Menu.MAIN);
        setActiveRect(undefined);
        setIsFocused(false);
        setIsOpen(false);
    }, [setActiveMenu, setActiveRect, setIsFocused, setIsOpen]);

    const handleClick = (): void => {
        setActiveMenu(Menu.MAIN);
        setActiveRect(undefined);
        setIsFocused(false);
        setIsOpen(!isOpen);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
        const key = decodeKeydown(event);

        if (key === 'Enter' || key === 'Space' || key === 'Tab' || key.indexOf('Arrow') >= 0) {
            setIsFocused(true); // User has interacted with the menu via keyboard directly
        }

        if (key === 'Escape') {
            resetControls();

            if (buttonElRef.current) {
                buttonElRef.current.focus(); // Prevent focus from falling back to the body on flyout close
            }
        }

        event.stopPropagation();
    };

    React.useEffect(() => {
        const handleDocumentClick = ({ target }: MouseEvent): void => {
            const { current: controlsEl } = controlsElRef;

            if (controlsEl && controlsEl.contains(target as Node)) {
                return;
            }

            resetControls();
        };

        document.addEventListener('click', handleDocumentClick);

        return (): void => {
            document.removeEventListener('click', handleDocumentClick);
        };
    }, [resetControls]);

    return (
        <div
            ref={controlsElRef}
            className={classNames('bp-MediaSettingsControls', className, { 'bp-is-focused': isFocused })}
            onKeyDown={handleKeyDown}
            role="presentation"
            {...rest}
        >
            <MediaSettingsContext.Provider value={{ activeMenu, activeRect, setActiveMenu, setActiveRect }}>
                <MediaSettingsToggle ref={buttonElRef} isOpen={isOpen} onClick={handleClick} />
                <MediaSettingsFlyout isOpen={isOpen}>{children}</MediaSettingsFlyout>
            </MediaSettingsContext.Provider>
        </div>
    );
}
