/**
 * Draft range the activity sidebar is holding. Preview draws start/end handles
 * on the waveform until the sidebar sends `comment_range_draft_clear`.
 * `endMs: null` means a single timestamp — both handles sit on `startMs`.
 */
export type CommentRangeDraft = {
    endMs: number | null;
    startMs: number;
};

/** Committed range after a handle drag. Always a real span (`endMs > startMs`). */
export type CommentRangeChange = {
    endMs: number;
    startMs: number;
};

/** Highlight a posted comment's range. Same payload shape as a committed drag. */
export type CommentRangeSelect = CommentRangeChange;

/** Sidebar → viewer: show or update the draft handles. */
export const EVENT_COMMENT_RANGE_DRAFT = 'comment_range_draft';

/** Sidebar → viewer: hide the handles (toggle-off, post, version switch, unmount). */
export const EVENT_COMMENT_RANGE_DRAFT_CLEAR = 'comment_range_draft_clear';

/** Viewer → sidebar: a handle drag finished. Emitted on pointer-up only. */
export const EVENT_COMMENT_RANGE_DRAFT_CHANGE = 'comment_range_draft_change';

/** Sidebar → viewer: highlight a posted comment's range. */
export const EVENT_COMMENT_RANGE_SELECT = 'comment_range_select';
