import React from 'react';
import classNames from 'classnames';
import './ControlsBar.scss';

export type Props = {
    children?: React.ReactNode;
    modernizationEnabled?: boolean;
};

export default function ControlsBar({ children, modernizationEnabled = false, ...rest }: Props): JSX.Element | null {
    if (!children) {
        return null;
    }

    return (
        <div
            className={classNames('bp-ControlsBar', {
                'bp-ControlsBar--modernized': modernizationEnabled,
            })}
            data-testid="bp-ControlsBar"
            {...rest}
        >
            {children}
        </div>
    );
}
