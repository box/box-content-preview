import React from 'react';
import classNames from 'classnames';
import MediaSettingsContext, { Menu, Rect } from './MediaSettingsContext';
import MediaSettingsFlyout from './MediaSettingsFlyout';
import MediaSettingsMenu from './MediaSettingsMenu';
import MediaSettingsMenuBack from './MediaSettingsMenuBack';
import MediaSettingsMenuItem from './MediaSettingsMenuItem';
import MediaSettingsRadioItem from './MediaSettingsRadioItem';
import MediaSettingsToggle, { Ref as MediaSettingsToggleRef } from './MediaSettingsToggle';
import { decodeKeydown } from '../../../../util';

export type Props = React.PropsWithChildren<{
    className?: string;
}>;

export default function MediaSettings({ children, className, ...rest }: Props): JSX.Element | null {
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
    }, []);

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
            className={classNames('bp-MediaSettings', className, { 'bp-is-focused': isFocused })}
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

MediaSettings.Context = MediaSettingsContext;
MediaSettings.Menu = MediaSettingsMenu;
MediaSettings.MenuBack = MediaSettingsMenuBack;
MediaSettings.MenuItem = MediaSettingsMenuItem;
MediaSettings.RadioItem = MediaSettingsRadioItem;
