import React from 'react';
import classNames from 'classnames';
import './RotateAxisControl.scss';

export type Axis = 'x' | 'y' | 'z';

export type AxisChange = {
    [key in Axis]?: number;
};

export type Props = {
    axis: Axis;
    className?: string;
    onRotateOnAxisChange: (change: AxisChange) => void;
};

const ROTATION_STEP = 90;

export default function RotateAxisControl({ axis, className, onRotateOnAxisChange }: Props): JSX.Element {
    const handleClickLeft = (): void => onRotateOnAxisChange({ [axis]: -ROTATION_STEP });
    const handleClickRight = (): void => onRotateOnAxisChange({ [axis]: ROTATION_STEP });

    return (
        <div className={classNames('bp-RotateAxisControl', className)}>
            <button className="bp-RotateAxisControl-left" onClick={handleClickLeft} type="button" />
            <span className="bp-RotateAxisControl-label">{axis}</span>
            <button className="bp-RotateAxisControl-right" onClick={handleClickRight} type="button" />
        </div>
    );
}
