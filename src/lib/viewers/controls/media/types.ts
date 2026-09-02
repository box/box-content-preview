export type CommentMarker = {
    avatarUrl?: string;
    colorIndex?: number;
    id: string;
    initial?: string;
    /** Host / activity-feed selection. Drives the waveform ring and a seek+pause. */
    isSelected?: boolean;
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
