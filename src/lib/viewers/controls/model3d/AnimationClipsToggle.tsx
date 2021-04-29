import React from 'react';
import IconAnimation24 from '../icons/IconAnimation24';
import './AnimationClipsToggle.scss';

export type Props = {
    onClick?: () => void;
};

export default function AnimationClipsToggle({ onClick }: Props): JSX.Element {
    return (
        <button className="bp-AnimationClipsToggle" onClick={onClick} title={__('box3d_animation_clips')} type="button">
            <IconAnimation24 />
        </button>
    );
}
