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

export default function MediaSettingsMenu({ children, className, isActive }: Props): JSX.Element | null {
    if (!children) {
        return null;
    }

    return (
        <div className={classNames('bp-MediaSettingsMenu', { 'bp-is-active': isActive }, className)} role="menu">
            {children}
        </div>
    );
}
