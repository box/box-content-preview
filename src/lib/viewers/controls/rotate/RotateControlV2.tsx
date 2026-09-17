import React from 'react';
import { Toolbar, Tooltip } from '@box/blueprint-web';
import RotateLeft from '@box/blueprint-web-assets/icons/Medium/RotateLeft';
import { Props } from './RotateControl';

export default function RotateControlV2({ onRotateLeft }: Props): JSX.Element {
    return (
        <Tooltip content={__('rotate_left')}>
            <Toolbar.Button aria-label={__('rotate_left')} data-resin-target="rotate" onClick={onRotateLeft}>
                <Toolbar.Icon icon={RotateLeft} />
            </Toolbar.Button>
        </Tooltip>
    );
}
