import React from 'react';
import { Toolbar } from '@box/blueprint-web';

export type Props = {
    children?: React.ReactNode;
};

function ControlsBarV2({ children, ...rest }: Props, ref: React.Ref<HTMLDivElement>): JSX.Element | null {
    if (!children) {
        return null;
    }

    return (
        <Toolbar.Root ref={ref} colorScheme="dark" data-testid="bp-ControlsBar" {...rest}>
            {children}
        </Toolbar.Root>
    );
}

export default React.forwardRef(ControlsBarV2);
