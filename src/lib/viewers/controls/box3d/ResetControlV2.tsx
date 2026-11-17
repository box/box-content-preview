import React from 'react';
import { Toolbar, Tooltip } from '@box/blueprint-web';
import { ArrowCurveForward } from '@box/blueprint-web-assets/icons/Medium';
import { Props } from './ResetControl';

export default function ResetControlV2({ onReset }: Props): JSX.Element {
    return (
        <Tooltip content={__('box3d_reset')}>
            <Toolbar.Button
                aria-label={__('box3d_reset')}
                data-resin-target="resetView"
                onClick={(): void => onReset()}
            >
                <Toolbar.Icon icon={ArrowCurveForward} />
            </Toolbar.Button>
        </Tooltip>
    );
}
