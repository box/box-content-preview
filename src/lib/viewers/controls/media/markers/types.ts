export type CommentMarker = {
    avatarUrl?: string;
    colorIndex?: number;
    id: string;
    initial?: string;
    /** Host / activity-feed selection. The painted ring follows the dismiss hook's selectedId. */
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
