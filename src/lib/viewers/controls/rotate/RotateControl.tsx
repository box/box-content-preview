import React from 'react';
import { IconButton } from '@box/blueprint-web';
import RotateLeft from '@box/blueprint-web-assets/icons/Medium/RotateLeft';
import './RotateControl.scss';

export type Props = {
    onRotateLeft: () => void;
};

export default function RotateControl({ onRotateLeft }: Props): JSX.Element {
    return (
        <IconButton
            aria-label={__('rotate_left')}
            className="bp-RotateControl"
            data-resin-target="rotate"
            icon={RotateLeft}
            onClick={onRotateLeft}
        />
    );
}
