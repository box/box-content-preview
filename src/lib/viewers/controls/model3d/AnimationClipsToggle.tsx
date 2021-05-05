import React from 'react';
import IconAnimation24 from '../icons/IconAnimation24';
import './AnimationClipsToggle.scss';

export type Props = {
    onClick?: () => void;
};

function AnimationClipsToggle(props: Props, ref: React.Ref<HTMLButtonElement>): JSX.Element {
    const { onClick } = props;

    return (
        <button
            ref={ref}
            className="bp-AnimationClipsToggle"
            onClick={onClick}
            title={__('box3d_animation_clips')}
            type="button"
        >
            <IconAnimation24 />
        </button>
    );
}

export default React.forwardRef(AnimationClipsToggle);
