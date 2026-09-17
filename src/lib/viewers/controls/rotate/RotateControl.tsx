import React from 'react';
import RotateLeft from '@box/blueprint-web-assets/icons/Medium/RotateLeft';
import './RotateControl.scss';

export type Props = {
    onRotateLeft: () => void;
};

export default function RotateControl({ onRotateLeft }: Props): JSX.Element {
    return (
        <button
            className="bp-RotateControl"
            data-resin-target="rotate"
            onClick={onRotateLeft}
            title={__('rotate_left')}
            type="button"
        >
            <RotateLeft color="#fff" />
        </button>
    );
}
