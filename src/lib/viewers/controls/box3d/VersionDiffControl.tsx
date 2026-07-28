import React from 'react';
import Icon3DLayerStack24 from '../icons/Icon3DLayerStack24';
import './VersionDiffControl.scss';

// DEMO ONLY — toolbar toggle for the 3D version-diff overlay. When inactive,
// the viewer shows only the original model; when active, the version-diff
// control bar + layered versions appear.
export type Props = {
    isActive: boolean;
    onVersionDiffToggle: () => void;
};

export default function VersionDiffControl({ isActive, onVersionDiffToggle }: Props): JSX.Element {
    return (
        <button
            aria-label={__('box3d_version_diff')}
            aria-pressed={isActive}
            className={`bp-VersionDiffControl${isActive ? ' bp-is-active' : ''}`}
            data-resin-target="model3dVersionDiff"
            onClick={onVersionDiffToggle}
            title={__('box3d_version_diff')}
            type="button"
        >
            <Icon3DLayerStack24 />
        </button>
    );
}
