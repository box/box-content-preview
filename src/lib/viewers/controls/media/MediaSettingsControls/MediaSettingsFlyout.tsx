import React from 'react';
import classNames from 'classnames';
import { Menu, Ref as MediaSettingsMenuRef } from './MediaSettingsMenu';
import './MediaSettingsFlyout.scss';

export type Props = {
    children: React.ReactNode;
    className?: string;
    menu: Menu;
};

const SETTINGS_MENU_PADDING = 18;
const SETTINGS_MENU_PADDING_SCROLL = 32;
const SETTINGS_MENU_MAX_HEIGHT = 210;

export default function MediaSettingsFlyout({ children, className, menu }: Props): JSX.Element | null {
    const [dimension, setDimension] = React.useState({});
    const [isInTransition, setIsInTransition] = React.useState(false);
    const refs = React.useRef<Array<MediaSettingsMenuRef>>([]);

    const handleTransitionEnd = (): void => setIsInTransition(false);

    React.useEffect(() => {
        const nextMenuEl = refs.current.find(ref => ref.classList.contains('bp-is-active'));

        if (nextMenuEl) {
            setIsInTransition(true);

            const { width, height } = nextMenuEl.getBoundingClientRect();
            const paddedHeight = height + SETTINGS_MENU_PADDING;

            // If the menu grows tall enough to require scrolling, take into account scroll bar width.
            const scrollPadding =
                paddedHeight >= SETTINGS_MENU_MAX_HEIGHT ? SETTINGS_MENU_PADDING_SCROLL : SETTINGS_MENU_PADDING;
            setDimension({ width: width + scrollPadding, height: paddedHeight });
        }
    }, [menu]);

    if (!children) {
        return null;
    }

    return (
        <div
            className={classNames('bp-MediaSettingsFlyout', { 'is-in-transition': isInTransition }, className)}
            onTransitionEnd={handleTransitionEnd}
            style={dimension}
        >
            {React.Children.map(children, menuEl => {
                if (!menuEl) {
                    return null;
                }

                if (!React.isValidElement(menuEl)) {
                    return menuEl;
                }

                return React.cloneElement(menuEl, {
                    ref: (ref: MediaSettingsMenuRef) => {
                        if (refs.current.length < React.Children.count(children)) {
                            refs.current.push(ref);
                        }
                    },
                    ...menuEl.props,
                });
            })}
        </div>
    );
}
