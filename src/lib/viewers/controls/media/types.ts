export type CommentMarker = {
    avatarUrl?: string;
    colorIndex?: number;
    id: string;
    initial?: string;
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
