import React from 'react';
import classNames from 'classnames';
import SettingsContext, { Menu } from './SettingsContext';
import { decodeKeydown } from '../../../util';
import './SettingsMenu.scss';

export type Props = React.PropsWithChildren<{
    className?: string;
    name: Menu;
}>;

export default function SettingsMenu({ children, className, name }: Props): JSX.Element | null {
    const [activeIndex, setActiveIndex] = React.useState(0);
    const [activeItem, setActiveItem] = React.useState<HTMLDivElement | null>(null);
    const { activeMenu, setActiveRect } = React.useContext(SettingsContext);
    const isActive = activeMenu === name;
    const menuElRef = React.useRef<HTMLDivElement>(null);

    const handleKeyDown = (event: React.KeyboardEvent): void => {
        const key = decodeKeydown(event);
        const max = React.Children.toArray(children).length - 1;

        if (key === 'ArrowUp' && activeIndex > 0) {
            setActiveIndex(activeIndex - 1);
        }

        if (key === 'ArrowDown' && activeIndex < max) {
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
        if (activeItem && isActive) {
            activeItem.focus();
        }
    }, [activeItem, isActive]);

    return (
        <div
            ref={menuElRef}
            className={classNames('bp-SettingsMenu', className, { 'bp-is-active': isActive })}
            onKeyDown={handleKeyDown}
            role="menu"
            tabIndex={0}
        >
            {React.Children.map(children, (menuItem, menuIndex) => {
                if (React.isValidElement(menuItem) && menuIndex === activeIndex) {
                    return React.cloneElement(menuItem, { ref: setActiveItem, ...menuItem.props });
                }

                return menuItem;
            })}
        </div>
    );
}
