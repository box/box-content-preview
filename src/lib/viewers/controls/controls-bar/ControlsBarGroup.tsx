import React from 'react';
import classNames from 'classnames';
import './ControlsBarGroup.scss';

export interface Props extends React.HTMLAttributes<HTMLDivElement> {
    isDistinct?: boolean;
}

export default function ControlsBarGroup({ children, className, isDistinct }: Props): JSX.Element {
    return (
        <div className={classNames('bp-ControlsBarGroup', { 'bp-ControlsBarGroup--distinct': isDistinct }, className)}>
            {children}
        </div>
    );
}
