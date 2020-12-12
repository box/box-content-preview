import React from 'react';
import './ControlsBar.scss';

export type Props = {
    children?: React.ReactNode;
};

export default function ControlsBar({ children, ...rest }: Props): JSX.Element | null {
    if (!children) {
        return null;
    }

    return (
        <div className="bp-ControlsBar" {...rest}>
            {children}
        </div>
    );
}
