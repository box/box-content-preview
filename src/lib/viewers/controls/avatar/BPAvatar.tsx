import React from 'react';
import classNames from 'classnames';
import './BPAvatar.scss';

export type AvatarSize = 'xsmall' | 'small';

export type Props = {
    avatarUrl?: string;
    text?: string;
    /**
     * `alt` for the image variant, `aria-label` for the text/silhouette variants.
     * Pass `''` to mark the avatar as decorative (suppresses `role="img"` and the
     * `aria-label`); use this when the parent already exposes the accessible name.
     */
    name?: string;
    size?: AvatarSize;
    className?: string;
};

const SIZE_CLASS: Record<AvatarSize, string> = {
    xsmall: 'bp-BPAvatar--xsmall',
    small: 'bp-BPAvatar--small',
};

function AnonymousAvatarIcon(): JSX.Element {
    return (
        <svg aria-hidden="true" className="bp-BPAvatar-anonymousIcon" focusable="false" viewBox="0 0 16 16">
            <path
                d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 1.5c-2.5 0-5 1.25-5 3.75V14h10v-.75c0-2.5-2.5-3.75-5-3.75Z"
                fill="currentColor"
            />
        </svg>
    );
}

export default function BPAvatar({ avatarUrl, text, name, size = 'small', className }: Props): JSX.Element {
    const root = classNames('bp-BPAvatar', SIZE_CLASS[size], className);
    const isDecorative = name === '';
    const initial = (text || '').trim();

    if (avatarUrl) {
        return <img alt={name || ''} className={classNames(root, 'bp-BPAvatar-image')} src={avatarUrl} />;
    }

    if (!initial) {
        return (
            <span
                aria-label={isDecorative ? undefined : name}
                className={classNames(root, 'bp-BPAvatar--anonymous')}
                role={isDecorative ? undefined : 'img'}
            >
                <AnonymousAvatarIcon />
            </span>
        );
    }

    const lengthClass = initial.length === 2 ? 'bp-BPAvatar-length-2' : 'bp-BPAvatar-length-1';

    return (
        <span aria-label={isDecorative ? undefined : name} className={root} role={isDecorative ? undefined : 'img'}>
            <span className={classNames('bp-BPAvatar-text', lengthClass)}>{initial}</span>
        </span>
    );
}
