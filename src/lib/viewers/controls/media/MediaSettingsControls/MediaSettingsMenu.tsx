import React from 'react';
import classNames from 'classnames';
import { decodeKeydown } from '../../../../util';
import MediaSettingsContext, { Menu } from './MediaSettingsContext';
import './MediaSettingsMenu.scss';

export type Props = React.PropsWithChildren<{
    className?: string;
    name: Menu;
}>;

export default function MediaSettingsMenu({ children, className, name }: Props): JSX.Element | null {
    const [activeIndex, setActiveIndex] = React.useState(0);
    const { activeMenu, setActiveRect } = React.useContext(MediaSettingsContext);
    const isActive = activeMenu === name;
    const menuElRef = React.useRef<HTMLDivElement>(null);
    const menuItemElRef = React.useRef<HTMLDivElement>(null);

    const handleKeyDown = (event: React.KeyboardEvent): void => {
        const key = decodeKeydown(event);
        const max = React.Children.toArray(children).length - 1;

        if (key === 'ArrowUp' && activeIndex - 1 >= 0) {
            setActiveIndex(activeIndex - 1);
        }

        if (key === 'ArrowDown' && activeIndex + 1 <= max) {
            setActiveIndex(activeIndex + 1);
        }
    };

    React.useEffect(() => {
        const { current: menuEl } = menuElRef;

        if (menuEl && isActive) {
            setActiveRect(menuEl.getBoundingClientRect());
        }
    }, [isActive, setActiveRect]);

    React.useEffect(() => {
        const { current: menuItemEl } = menuItemElRef;

        if (menuItemEl && isActive) {
            menuItemEl.focus();
        }
    }, [activeIndex, isActive]);

    return (
        <div
            ref={menuElRef}
            className={classNames('bp-MediaSettingsMenu', className, { 'bp-is-active': isActive })}
            onKeyDown={handleKeyDown}
            role="menu"
            tabIndex={0}
        >
            {React.Children.map(children, (menuItem, menuIndex) => {
                if (React.isValidElement(menuItem) && menuIndex === activeIndex) {
                    return React.cloneElement(menuItem, { ref: menuItemElRef, ...menuItem.props });
                }

                return menuItem;
            })}
        </div>
    );
}
