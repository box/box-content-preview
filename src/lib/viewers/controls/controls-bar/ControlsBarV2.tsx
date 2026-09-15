import React from 'react';
import { Toolbar } from '@box/blueprint-web';

export type Props = {
    children?: React.ReactNode;
};

export default function ControlsBarV2({ children, ...rest }: Props): JSX.Element | null {
    if (!children) {
        return null;
    }

    return (
        <Toolbar.Root data-testid="bp-ControlsBar" {...rest}>
            {children}
        </Toolbar.Root>
    );
}
