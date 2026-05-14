import React from 'react';
import IconRotate24 from '../icons/IconRotate24';
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
            <IconRotate24 />
        </button>
    );
}
