import React from 'react';
import classNames from 'classnames';
import './MediaSettingsMenu.scss';

export type Props = {
    children?: React.ReactNode;
    className?: string;
    isActive: boolean;
};

export enum Menu {
    MAIN = 'main',
    AUTOPLAY = 'autoplay',
    SPEED = 'speed',
}

export type Ref = HTMLDivElement;

function MediaSettingsMenu({ children, className, isActive }: Props, ref: React.Ref<Ref>): JSX.Element | null {
    if (!children) {
        return null;
    }

    return (
        <div
            ref={ref}
            className={classNames('bp-MediaSettingsMenu', { 'bp-is-active': isActive }, className)}
            role="menu"
        >
            {children}
        </div>
    );
}

export default React.forwardRef(MediaSettingsMenu);
