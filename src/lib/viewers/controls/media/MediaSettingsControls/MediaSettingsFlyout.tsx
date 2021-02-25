import React from 'react';
import classNames from 'classnames';
import { Menu } from './MediaSettingsMenu';
import './MediaSettingsFlyout.scss';

export type Props = {
    children: React.ReactNode;
    className?: string;
    menu: Menu;
    menuSelectors: Record<string, string>;
};

const SETTINGS_MENU_PADDING = 18;
const SETTINGS_MENU_PADDING_SCROLL = 32;
const SETTINGS_MENU_MAX_HEIGHT = 210;

export default function MediaSettingsFlyout({ children, className, menu, menuSelectors }: Props): JSX.Element | null {
    const [dimension, setDimension] = React.useState({});
    const flyoutRef = React.useRef<HTMLDivElement>(null);

    const handleTransitionEnd = (): void => {
        const { current: flyoutEl } = flyoutRef;

        if (flyoutEl) {
            flyoutEl.classList.remove('bp-MediaSettingsFlyout-in-transition');
        }
    };

    React.useEffect(() => {
        const { current: flyoutEl } = flyoutRef;

        if (flyoutEl) {
            flyoutEl.addEventListener('transitionend', handleTransitionEnd);
        }

        return (): void => {
            if (flyoutEl) {
                flyoutEl.removeEventListener('transitionend', handleTransitionEnd);
            }
        };
    }, [flyoutRef]);

    React.useEffect(() => {
        const nextMenuEl = document.querySelector(menuSelectors[menu]);
        const { current: flyoutEl } = flyoutRef;

        if (nextMenuEl && flyoutEl) {
            flyoutEl.classList.add('bp-MediaSettingsFlyout-in-transition');

            const { width, height } = nextMenuEl.getBoundingClientRect();
            const paddedHeight = height + SETTINGS_MENU_PADDING;

            // If the menu grows tall enough to require scrolling, take into account scroll bar width.
            const scrollPadding =
                paddedHeight >= SETTINGS_MENU_MAX_HEIGHT ? SETTINGS_MENU_PADDING_SCROLL : SETTINGS_MENU_PADDING;
            setDimension({ width: width + scrollPadding, height: paddedHeight });
        }
    }, [menu, menuSelectors]);

    if (!children) {
        return null;
    }

    return (
        <div ref={flyoutRef} className={classNames('bp-MediaSettingsFlyout', className)} style={dimension}>
            {children}
        </div>
    );
}
