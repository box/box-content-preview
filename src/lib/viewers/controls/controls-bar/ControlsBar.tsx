import React from 'react';
import './ControlsBar.scss';

export type Props = {
    children: React.ReactNode;
};

export default function ControlsBar({ children, ...rest }: Props): JSX.Element {
    return (
        <div className="bp-ControlsBar" {...rest}>
            {children}
        </div>
    );
}
