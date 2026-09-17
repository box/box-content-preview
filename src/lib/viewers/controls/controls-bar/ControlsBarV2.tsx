import React from 'react';
import { Toolbar } from '@box/blueprint-web';
import './ControlsBarV2.scss';

export type Props = {
    children?: React.ReactNode;
};

export function ControlsBarV2Stack({ children }: Props): JSX.Element {
    return <div className="bp-ControlsBarV2-stack">{children}</div>;
}

export default function ControlsBarV2({ children, ...rest }: Props): JSX.Element | null {
    if (!children) {
        return null;
    }

    return (
        <Toolbar.Root className="bp-ControlsBarV2" data-testid="bp-ControlsBar" {...rest}>
            {children}
        </Toolbar.Root>
    );
}
