import React from 'react';
import classNames from 'classnames';
import IconRotate24 from '../icons/IconRotate24';
import './RotateControl.scss';

export type Props = {
    onRotateLeft: () => void;
    modernizationEnabled?: boolean;
};

export default function RotateControl({ onRotateLeft, modernizationEnabled = false }: Props): JSX.Element {
    return (
        <button
            className={classNames('bp-RotateControl', { 'bp-RotateControl--modernized': modernizationEnabled })}
            onClick={onRotateLeft}
            title={__('rotate_left')}
            type="button"
        >
            <IconRotate24 />
        </button>
    );
}
