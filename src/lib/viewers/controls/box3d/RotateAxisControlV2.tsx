import React from 'react';
import { IconButton, Text } from '@box/blueprint-web';
import { RotateLeft } from '@box/blueprint-web-assets/icons/Medium';
import { Axis, AxisChange } from './RotateAxisControl';
import RotateRight from './RotateRight';
import { replacePlaceholders } from '../../../util';
import './RotateAxisControlV2.scss';

export type Props = {
    axis: Axis;
    onRotateOnAxisChange: (change: AxisChange) => void;
};

const ROTATION_STEP = 90;

export default function RotateAxisControlV2({ axis, onRotateOnAxisChange }: Props): JSX.Element {
    const axisName = axis.toUpperCase();
    const handleClickLeft = (): void => onRotateOnAxisChange({ [axis]: -ROTATION_STEP });
    const handleClickRight = (): void => onRotateOnAxisChange({ [axis]: ROTATION_STEP });

    return (
        <div className="bp-RotateAxisControlV2" data-testid={`bp-rotate-axis-control-${axis}`}>
            <IconButton
                aria-label={replacePlaceholders(__('box3d_settings_rotate_left'), [axisName])}
                data-resin-target="rotateAxisLeft"
                data-testid="bp-rotate-axis-control-left"
                icon={RotateLeft}
                onClick={handleClickLeft}
            />
            <Text as="span" data-testid="bp-rotate-axis-control-label" variant="bodyDefaultBold">
                {axisName}
            </Text>
            <IconButton
                aria-label={replacePlaceholders(__('box3d_settings_rotate_right'), [axisName])}
                data-resin-target="rotateAxisRight"
                data-testid="bp-rotate-axis-control-right"
                icon={RotateRight}
                onClick={handleClickRight}
            />
        </div>
    );
}
