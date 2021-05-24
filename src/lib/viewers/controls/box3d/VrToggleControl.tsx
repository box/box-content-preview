import React from 'react';
import IconVr24 from '../icons/IconVr24';
import './VrToggleControl.scss';

export type Props = {
    isVrShown: boolean;
    onVrToggle: () => void;
};

export default function VrToggleControl({ isVrShown, onVrToggle }: Props): JSX.Element | null {
    if (!isVrShown) {
        return null;
    }

    return (
        <button className="bp-VrToggleControl" onClick={onVrToggle} title={__('box3d_toggle_vr')} type="button">
            <IconVr24 />
        </button>
    );
}
