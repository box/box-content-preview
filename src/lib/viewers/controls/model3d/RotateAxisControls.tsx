import React from 'react';
import RotateAxisControl, { AxisChange } from './RotateAxisControl';
import './RotateAxisControls.scss';

export type Props = {
    onRotateOnAxisChange: (change: AxisChange) => void;
};

export default function RotateAxisControls({ onRotateOnAxisChange }: Props): JSX.Element {
    return (
        <div className="bp-RotateAxisControls">
            <div className="bp-RotateAxisControls-label">{__('box3d_settings_rotate_label')}</div>
            <div className="bp-RotateAxisControls-controls">
                <RotateAxisControl
                    axis="x"
                    className="bp-RotateAxisControls-rotateX"
                    onRotateOnAxisChange={onRotateOnAxisChange}
                />
                <RotateAxisControl
                    axis="y"
                    className="bp-RotateAxisControls-rotateY"
                    onRotateOnAxisChange={onRotateOnAxisChange}
                />
                <RotateAxisControl
                    axis="z"
                    className="bp-RotateAxisControls-rotateZ"
                    onRotateOnAxisChange={onRotateOnAxisChange}
                />
            </div>
        </div>
    );
}
