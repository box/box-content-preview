/**
 * Draft range the activity sidebar is holding. Preview draws start/end handles
 * on the waveform until the sidebar sends `comment_range_draft_clear`.
 * The viewer emits `comment_range_draft_change` on pointer-up so the host
 * can persist the new timestamps, and `comment_range_draft_dismiss` when
 * the user clicks the waveform outside an open range. See media/README.md.
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

/** Viewer → sidebar: the user clicked the waveform outside an open draft range. */
export const EVENT_COMMENT_RANGE_DRAFT_DISMISS = 'comment_range_draft_dismiss';

/** Viewer → sidebar: a handle drag finished. Emitted on pointer-up only. */
export const EVENT_COMMENT_RANGE_DRAFT_CHANGE = 'comment_range_draft_change';

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
