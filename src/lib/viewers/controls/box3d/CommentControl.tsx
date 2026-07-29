import React from 'react';
import IconDashedSquareBubbleMedium24 from '../icons/IconDashedSquareBubbleMedium24';
import './CommentControl.scss';

export type Props = {
    isActive: boolean;
    onCommentToggle: () => void;
};

export default function CommentControl({ isActive, onCommentToggle, ...rest }: Props): JSX.Element {
    return (
        <button
            aria-label={__('box3d_comment')}
            aria-pressed={isActive}
            className={`bp-CommentControl${isActive ? ' bp-is-active' : ''}`}
            data-resin-target="model3dComment"
            data-testid="bp-CommentControl"
            onClick={onCommentToggle}
            title={__('box3d_comment')}
            type="button"
            {...rest}
        >
            <IconDashedSquareBubbleMedium24 />
        </button>
    );
}
