import React from 'react';
import BPAvatar, { AvatarSize } from '../avatar/BPAvatar';
import { formatTime } from './DurationLabels';
import './TimelineMarker.scss';

export type TimestampedComment = {
    createdAt?: string;
    id: string;
    /** Body with the timestamp prefix already stripped. */
    message?: string;
    /** Video position in seconds. */
    time: number;
    user: { avatarUrl?: string; name: string };
};

// Grace period (ms) so the cursor can transit from avatar/tick → bubble
// without the bubble closing underneath.
const HOVER_CLOSE_DELAY_MS = 50;

// Strips bracketed prefixes/suffixes before taking the first letter so they
// don't become the visible initial. Returns '' when no usable letter remains.
const getInitials = (name: string): string => {
    const cleaned = name.replace(/[[({<]+.*[\])}>]+/g, '').trim();
    if (!cleaned) return '';
    return cleaned.charAt(0).toUpperCase();
};

const MarkerAvatar = ({
    user,
    size,
    decorative = false,
}: {
    decorative?: boolean;
    size: AvatarSize;
    user: TimestampedComment['user'];
}): JSX.Element => (
    <BPAvatar avatarUrl={user.avatarUrl} name={decorative ? '' : user.name} size={size} text={getInitials(user.name)} />
);

const formatRelativeTime = (iso?: string): string => {
    if (!iso) return '';
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return '';
    const diffSec = Math.max(0, Math.round((Date.now() - then) / 1000));
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.round(diffSec / 60);
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffHr = Math.round(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.round(diffHr / 24);
    if (diffDay < 30) return `${diffDay}d ago`;
    const diffMo = Math.round(diffDay / 30);
    if (diffMo < 12) return `${diffMo}mo ago`;
    return `${Math.round(diffMo / 12)}y ago`;
};

export type Props = {
    comment: TimestampedComment;
    durationTime: number;
    onMarkerClick?: (comment: TimestampedComment) => void;
    /** Stacking order; higher values paint on top of lower ones. */
    zIndex?: number;
};

export default function TimelineMarker({ comment, durationTime, onMarkerClick, zIndex }: Props): JSX.Element {
    const { createdAt, message, time, user } = comment;
    const left = `${Math.max(0, Math.min((time / durationTime) * 100, 100))}%`;

    const [isOpen, setIsOpen] = React.useState(false);
    const closeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const cancelScheduledClose = React.useCallback(() => {
        if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
    }, []);

    const scheduleClose = React.useCallback(() => {
        cancelScheduledClose();
        closeTimerRef.current = setTimeout(() => setIsOpen(false), HOVER_CLOSE_DELAY_MS);
    }, [cancelScheduledClose]);

    const handleHoverOpen = React.useCallback(() => {
        cancelScheduledClose();
        setIsOpen(true);
    }, [cancelScheduledClose]);

    React.useEffect(() => () => cancelScheduledClose(), [cancelScheduledClose]);

    const activate = (): void => {
        if (onMarkerClick) {
            onMarkerClick(comment);
        }
    };
    const handleClick = (event: React.MouseEvent<HTMLSpanElement>): void => {
        event.stopPropagation(); // don't let the click bubble to the slider's seek handler
        event.currentTarget.focus(); // keep the native focus ring on the clicked marker
        activate();
    };
    const handleKeyDown = (event: React.KeyboardEvent): void => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            event.stopPropagation();
            activate();
        }
    };

    return (
        <span
            className="bp-TimelineMarker"
            data-testid="bp-TimelineMarker"
            onBlur={scheduleClose}
            onClick={handleClick}
            onFocus={handleHoverOpen}
            onKeyDown={handleKeyDown}
            onMouseDown={event => event.stopPropagation()} // SliderControl reacts to mousedown
            onMouseEnter={handleHoverOpen}
            onMouseLeave={scheduleClose}
            role="button"
            style={zIndex !== undefined ? { left, zIndex } : { left }}
            tabIndex={0}
        >
            <MarkerAvatar size="xsmall" user={user} />
            <span className="bp-TimelineMarker-tick" data-testid="bp-TimelineMarker-tick" />
            {isOpen ? (
                <span
                    className="bp-TimelineMarker-bubble"
                    data-testid="bp-TimelineMarker-bubble"
                    onMouseEnter={cancelScheduledClose}
                    onMouseLeave={scheduleClose}
                >
                    <span className="bp-TimelineMarker-bubbleHeader">
                        <MarkerAvatar decorative size="small" user={user} />
                        <span className="bp-TimelineMarker-bubbleAuthor">{user.name}</span>
                    </span>
                    <span className="bp-TimelineMarker-bubbleBody">
                        <span className="bp-TimelineMarker-bubbleTimestamp">▶ {formatTime(time)}</span>
                        {message ? <span className="bp-TimelineMarker-bubbleMessage">{message}</span> : null}
                    </span>
                    {createdAt ? (
                        <span className="bp-TimelineMarker-bubbleFooter">{formatRelativeTime(createdAt)}</span>
                    ) : null}
                </span>
            ) : null}
        </span>
    );
}
