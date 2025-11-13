import React from 'react';
import classNames from 'classnames';
import './ControlsBarGroup.scss';

export interface Props extends React.HTMLAttributes<HTMLDivElement> {
    isDistinct?: boolean;
    modernizationEnabled?: boolean;
}

export default function ControlsBarGroup({
    children,
    className,
    isDistinct,
    modernizationEnabled = false,
}: Props): JSX.Element {
    return (
        <div
            className={classNames(
                'bp-ControlsBarGroup',
                {
                    'bp-ControlsBarGroup--distinct': isDistinct,
                    'bp-ControlsBarGroup--modernized': modernizationEnabled,
                },
                className,
            )}
        >
            {children}
        </div>
    );
}
