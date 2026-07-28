import React from 'react';
import IconWatermarkMedium24 from '../icons/IconWatermarkMedium24';
import './WatermarkControl.scss';

export type Props = {
    isActive: boolean;
    onWatermarkToggle: () => void;
};

export default function WatermarkControl({ isActive, onWatermarkToggle }: Props): JSX.Element {
    return (
        <button
            aria-label={__('box3d_watermark')}
            aria-pressed={isActive}
            className={`bp-WatermarkControl${isActive ? ' bp-is-active' : ''}`}
            data-resin-target="model3dWatermark"
            onClick={onWatermarkToggle}
            title={__('box3d_watermark')}
            type="button"
        >
            <IconWatermarkMedium24 />
        </button>
    );
}
