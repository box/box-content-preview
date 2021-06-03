import React from 'react';
import classNames from 'classnames';
import noop from 'lodash/noop';
import SettingsCheckboxItem from './SettingsCheckboxItem';
import SettingsContext, { Menu, Rect } from './SettingsContext';
import SettingsDropdown from './SettingsDropdown';
import SettingsFlyout from './SettingsFlyout';
import SettingsGearToggle, { Props as SettingsGearToggleProps, Ref as SettingsToggleRef } from './SettingsToggle';
import SettingsMenu from './SettingsMenu';
import SettingsMenuBack from './SettingsMenuBack';
import SettingsMenuItem from './SettingsMenuItem';
import SettingsRadioItem from './SettingsRadioItem';
import useClickOutside from '../hooks/useClickOutside';
import { decodeKeydown } from '../../../util';

export type Props = Pick<SettingsGearToggleProps, 'badge'> &
    React.PropsWithChildren<{
        className?: string;
        onClose?: () => void;
        onOpen?: () => void;
        toggle?: React.ElementType;
    }>;
export default function Settings({
    badge,
    children,
    className,
    onClose = noop,
    onOpen = noop,
    toggle: SettingsToggle = SettingsGearToggle,
    ...rest
}: Props): JSX.Element | null {
    const [activeMenu, setActiveMenu] = React.useState(Menu.MAIN);
    const [activeRect, setActiveRect] = React.useState<Rect>();
    const [isFocused, setIsFocused] = React.useState(false);
    const [isOpen, setIsOpen] = React.useState(false);
    const buttonElRef = React.useRef<SettingsToggleRef>(null);
    const controlsElRef = React.useRef<HTMLDivElement>(null);
    const resetControls = React.useCallback(() => {
        setActiveMenu(Menu.MAIN);
        setActiveRect(undefined);
        setIsFocused(false);
        setIsOpen(false);

        onClose();
    }, [onClose]);
    const { height, width } = activeRect || { height: 'auto', width: 'auto' };

    const handleClick = (): void => {
        setActiveMenu(Menu.MAIN);
        setActiveRect(undefined);
        setIsFocused(false);
        setIsOpen(!isOpen);

        if (!isOpen) {
            onOpen();
        } else {
            onClose();
        }
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

    useClickOutside(controlsElRef, resetControls);

    return (
        <div
            ref={controlsElRef}
            className={classNames('bp-Settings', className, { 'bp-is-focused': isFocused })}
            onKeyDown={handleKeyDown}
            role="presentation"
            {...rest}
        >
            <SettingsContext.Provider value={{ activeMenu, setActiveMenu, setActiveRect }}>
                <SettingsToggle ref={buttonElRef} badge={badge} isOpen={isOpen} onClick={handleClick} />
                <SettingsFlyout className="bp-Settings-flyout" height={height} isOpen={isOpen} width={width}>
                    {children}
                </SettingsFlyout>
            </SettingsContext.Provider>
        </div>
    );
}

Settings.CheckboxItem = SettingsCheckboxItem;
Settings.Context = SettingsContext;
Settings.Dropdown = SettingsDropdown;
Settings.Menu = SettingsMenu;
Settings.MenuBack = SettingsMenuBack;
Settings.MenuItem = SettingsMenuItem;
Settings.RadioItem = SettingsRadioItem;
