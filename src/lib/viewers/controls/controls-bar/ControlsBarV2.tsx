import React from 'react';
import { Toolbar } from '@box/blueprint-web';

export type Props = {
    children?: React.ReactNode;
};

// Blueprint moves focus between the bar's items and the color swatches with these keys but lets them bubble on,
// where preview's document listener would turn the page or open the next file
const FOCUS_KEYS = new Set(['ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'End', 'Home']);

const stopFocusKeyPropagation = (event: React.KeyboardEvent): void => {
    if (FOCUS_KEYS.has(event.key)) {
        event.stopPropagation();
    }
};

function ControlsBarV2({ children, ...rest }: Props, ref: React.Ref<HTMLDivElement>): JSX.Element | null {
    if (!children) {
        return null;
    }

    return (
        <Toolbar.Root
            ref={ref}
            colorScheme="dark"
            data-testid="bp-ControlsBar"
            {...rest}
            onKeyDown={stopFocusKeyPropagation}
        >
            {children}
        </Toolbar.Root>
    );
}

export default React.forwardRef(ControlsBarV2);
