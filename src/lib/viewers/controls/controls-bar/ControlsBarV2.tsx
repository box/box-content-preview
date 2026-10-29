import React from 'react';
import { Toolbar } from '@box/blueprint-web';
import { stopToolbarKeyPropagation } from '../media/utils';
import './ControlsBarV2.scss';

export type Props = {
    'aria-label'?: string;
    children?: React.ReactNode;
    // The Context Toolbar sizes from the mocks: large for the main bars, small for the annotations palette
    size?: 'large' | 'small';
};

function ControlsBarV2(
    { 'aria-label': ariaLabel = __('controls_toolbar'), children, size = 'large', ...rest }: Props,
    ref: React.Ref<HTMLDivElement>,
): JSX.Element | null {
    if (!children) {
        return null;
    }

    return (
        <Toolbar.Root
            ref={ref}
            aria-label={ariaLabel}
            className={`bp-ControlsBarV2 bp-ControlsBarV2--${size}`}
            colorScheme="dark"
            data-testid="bp-ControlsBar"
            {...rest}
            onKeyDown={stopToolbarKeyPropagation}
        >
            {children}
        </Toolbar.Root>
    );
}

export default React.forwardRef(ControlsBarV2);
