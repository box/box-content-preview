import React from 'react';
import './MarkerAvatar.scss';

const AVATAR_PALETTE: ReadonlyArray<{ bg: string; fg: string }> = [
    { bg: '#7fb0ea', fg: '#222' },
    { bg: '#003c84', fg: '#fff' },
    { bg: '#ffeb7f', fg: '#222' },
    { bg: '#92e0c0', fg: '#222' },
    { bg: '#fad98d', fg: '#222' },
    { bg: '#91c2fd', fg: '#222' },
    { bg: '#f69bab', fg: '#222' },
    { bg: '#cf9ff6', fg: '#222' },
    { bg: '#f8c08c', fg: '#222' },
    { bg: '#a392e0', fg: '#222' },
];

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
    const { bg: bgColor, fg: textColor } = AVATAR_PALETTE[colorIndex % AVATAR_PALETTE.length];

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
