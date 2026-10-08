export type CommentMarker = {
    avatarUrl?: string;
    colorIndex?: number;
    /**
     * End of a ranged timestamp comment, in seconds. Absent for a point comment.
     * `time` is the start. A selected range is drawn read-only on the audio waveform.
     */
    endTime?: number;
    id: string;
    initial?: string;
    /** Host / activity-feed selection. The painted ring follows the dismiss hook's selectedId. */
    isSelected?: boolean;
    /**
     * Increments when the user selects this same comment again.
     * A feed refresh keeps the previous value and must not seek again.
     */
    selectionSeq?: number;
    time: number;
    type?: 'annotation' | 'comment';
};

export type ClusterData = {
    id: string;
    isSinglePoint: boolean;
    leftPercent: number;
    markers: CommentMarker[];
    rightPercent: number;
};
