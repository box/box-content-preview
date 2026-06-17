import React from 'react';
import TimelineMarker, { TimestampedComment } from './TimelineMarker';
import './TimelineMarkers.scss';

export { TimestampedComment };

export type Props = {
    comments: Array<TimestampedComment>;
    durationTime?: number;
    onMarkerClick?: (comment: TimestampedComment) => void;
};

export default function TimelineMarkers({ comments, durationTime = 0, onMarkerClick }: Props): JSX.Element | null {
    if (!durationTime || !comments.length) {
        return null;
    }

    // Earliest first → later markers paint on top so same-time stacks cascade
    // newest-frontmost.
    const ordered = [...comments].sort((a, b) => a.time - b.time);

    return (
        <div className="bp-TimelineMarkers" data-testid="bp-TimelineMarkers">
            {ordered.map((comment, index) => (
                <TimelineMarker
                    key={comment.id}
                    comment={comment}
                    durationTime={durationTime}
                    onMarkerClick={onMarkerClick}
                    zIndex={index + 1}
                />
            ))}
        </div>
    );
}
