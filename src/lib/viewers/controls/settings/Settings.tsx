import React from 'react';
import classNames from 'classnames';
import SettingsCheckboxItem from './SettingsCheckboxItem';
import SettingsContext, { Menu, Rect } from './SettingsContext';
import SettingsFlyout from './SettingsFlyout';
import SettingsGearToggle, { Ref as SettingsToggleRef } from './SettingsToggle';
import SettingsListbox from './SettingsListbox';
import SettingsMenu from './SettingsMenu';
import SettingsMenuBack from './SettingsMenuBack';
import SettingsMenuItem from './SettingsMenuItem';
import SettingsRadioItem from './SettingsRadioItem';
import { decodeKeydown } from '../../../util';

export type Props = React.PropsWithChildren<{
    className?: string;
    toggle?: React.ElementType;
}>;

export default function Settings({
    children,
    className,
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
            className={classNames('bp-Settings', className, { 'bp-is-focused': isFocused })}
            onKeyDown={handleKeyDown}
            role="presentation"
            {...rest}
        >
            <SettingsContext.Provider value={{ activeMenu, activeRect, setActiveMenu, setActiveRect }}>
                <SettingsToggle ref={buttonElRef} isOpen={isOpen} onClick={handleClick} />
                <SettingsFlyout isOpen={isOpen}>{children}</SettingsFlyout>
            </SettingsContext.Provider>
        </div>
    );
}

Settings.CheckboxItem = SettingsCheckboxItem;
Settings.Context = SettingsContext;
Settings.Listbox = SettingsListbox;
Settings.Menu = SettingsMenu;
Settings.MenuBack = SettingsMenuBack;
Settings.MenuItem = SettingsMenuItem;
Settings.RadioItem = SettingsRadioItem;
