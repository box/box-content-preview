import React from 'react';
import IconPencilScribbleMedium24 from '../icons/IconPencilScribbleMedium24';
import './DrawControl.scss';

export type Props = {
    isActive: boolean;
    onDrawToggle: () => void;
};

export default function DrawControl({ isActive, onDrawToggle }: Props): JSX.Element {
    return (
        <button
            aria-label={__('box3d_draw')}
            aria-pressed={isActive}
            className={`bp-DrawControl${isActive ? ' bp-is-active' : ''}`}
            data-resin-target="model3dDraw"
            onClick={onDrawToggle}
            title={__('box3d_draw')}
            type="button"
        >
            <IconPencilScribbleMedium24 />
        </button>
    );
}
