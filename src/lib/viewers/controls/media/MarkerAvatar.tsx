import React from 'react';
import './MarkerAvatar.scss';

const AVATAR_COLORS = [
    '#7fb0ea',
    '#003c84',
    '#ffeb7f',
    '#92e0c0',
    '#fad98d',
    '#91c2fd',
    '#f69bab',
    '#cf9ff6',
    '#f8c08c',
    '#a392e0',
];

const DARK_COLOR_INDICES = new Set([1]);

export type Props = {
    avatarUrl?: string;
    colorIndex?: number;
    initial?: string;
};

function AnonymousAvatarIcon(): JSX.Element {
    return (
        <svg aria-hidden="true" className="bp-MarkerAvatar-anonymousIcon" focusable="false" viewBox="0 0 16 16">
            <path
                d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 1.5c-2.5 0-5 1.25-5 3.75V14h10v-.75c0-2.5-2.5-3.75-5-3.75Z"
                fill="currentColor"
            />
        </svg>
    );
}

export default function MarkerAvatar({ avatarUrl, colorIndex = 0, initial }: Props): JSX.Element {
    const index = colorIndex % AVATAR_COLORS.length;
    const bgColor = AVATAR_COLORS[index];
    const textColor = DARK_COLOR_INDICES.has(index) ? '#fff' : '#222';

    const [imgFailed, setImgFailed] = React.useState(false);
    const showImage = Boolean(avatarUrl) && !imgFailed;

    let avatar = <AnonymousAvatarIcon />;
    if (showImage) {
        avatar = <img alt="" onError={() => setImgFailed(true)} src={avatarUrl} />;
    } else if (initial) {
        avatar = (
            <span className="bp-MarkerAvatar-initial" style={{ color: textColor }}>
                {initial}
            </span>
        );
    }

    return (
        <span className="bp-MarkerAvatar" style={!showImage ? { backgroundColor: bgColor } : undefined}>
            {avatar}
        </span>
    );
}
