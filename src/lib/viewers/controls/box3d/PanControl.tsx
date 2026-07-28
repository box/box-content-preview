import React from 'react';
import Icon3DPan24 from '../icons/Icon3DPan24';
import './PanControl.scss';

export type Props = {
    isActive: boolean;
    onPanToggle: () => void;
};

export default function PanControl({ isActive, onPanToggle }: Props): JSX.Element {
    return (
        <button
            aria-label={__('box3d_pan')}
            aria-pressed={isActive}
            className={`bp-PanControl${isActive ? ' bp-is-active' : ''}`}
            data-resin-target="model3dPan"
            onClick={onPanToggle}
            title={__('box3d_pan')}
            type="button"
        >
            <Icon3DPan24 />
        </button>
    );
}
