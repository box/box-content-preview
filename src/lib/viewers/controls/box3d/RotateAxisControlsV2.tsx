import React from 'react';
import { Text } from '@box/blueprint-web';
import RotateAxisControlV2 from './RotateAxisControlV2';
import { Props } from './RotateAxisControls';
import './RotateAxisControlsV2.scss';

export default function RotateAxisControlsV2({ onRotateOnAxisChange }: Props): JSX.Element {
    const labelId = React.useId();

    return (
        <div aria-labelledby={labelId} className="bp-RotateAxisControlsV2" role="group">
            <Text as="span" data-testid="bp-rotate-axis-controls-label" id={labelId} variant="bodyDefaultBold">
                {__('box3d_settings_rotate_label')}
            </Text>
            <RotateAxisControlV2 axis="x" onRotateOnAxisChange={onRotateOnAxisChange} />
            <RotateAxisControlV2 axis="y" onRotateOnAxisChange={onRotateOnAxisChange} />
            <RotateAxisControlV2 axis="z" onRotateOnAxisChange={onRotateOnAxisChange} />
        </div>
    );
}
