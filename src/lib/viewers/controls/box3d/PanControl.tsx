import React from 'react';
import IconHandMedium24 from '../icons/IconHandMedium24';
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
            <IconHandMedium24 />
        </button>
    );
}
