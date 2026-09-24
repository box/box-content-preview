/**
 * Draft range drawn on the waveform. Sidebar sends `comment_range_draft`
 * when checkbox is toggled on and Preview keeps the handles until
 * `comment_range_draft_clear`. A waveform drag can also create a local draft
 * before the timestamp toggle is on. See media/README.md.
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

/** Sidebar → viewer: show or update the draft handles. */
export const EVENT_COMMENT_RANGE_DRAFT = 'comment_range_draft';

/** Sidebar → viewer: hide the handles (toggle-off, post, version switch, unmount). */
export const EVENT_COMMENT_RANGE_DRAFT_CLEAR = 'comment_range_draft_clear';

/** Viewer → sidebar: click outside an open range while the timestamp toggle is already on. */
export const EVENT_COMMENT_RANGE_DRAFT_DISMISS = 'comment_range_draft_dismiss';

/**
 * Viewer → sidebar: a range edit finished while the timestamp toggle is already on.
 * Pointer-up only. Not used to start commenting — that is `comment_range_compose`.
 */
export const EVENT_COMMENT_RANGE_DRAFT_CHANGE = 'comment_range_draft_change';

/**
 * Viewer → sidebar: the user pressed Comment on a draft range.
 * The host opens Activity if needed, checks the timestamp toggle, and adopts
 * `{ startMs, endMs }` without echoing `comment_range_draft`.
 */
export const EVENT_COMMENT_RANGE_DRAG_CREATE = 'comment_range_compose';

/** True when a host draft can be shown. Collapsed drafts use `endMs: null`. */
export function isValidCommentRangeDraft(value: unknown): value is CommentRangeDraft {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const draft = value as { endMs?: unknown; startMs?: unknown };
    if (!Number.isFinite(draft.startMs)) {
        return false;
    }
    if (draft.endMs != null && (!Number.isFinite(draft.endMs) || Number(draft.endMs) <= Number(draft.startMs))) {
        return false;
    }
    return true;
}
