export const CLASS_ANNOTATION_BUTTON_CANCEL = 'cancel-annotation-btn';
export const CLASS_ANNOTATION_BUTTON_POST = 'post-annotation-btn';
export const CLASS_MOBILE_ANNOTATION_DIALOG = 'bp-mobile-annotation-dialog';
export const CLASS_ANNOTATION_DIALOG = 'bp-annotation-dialog';
export const CLASS_ANNOTATION_DIALOG_HIGHLIGHT = 'bp-highlight-dialog';
export const CLASS_ANNOTATION_TEXT_HIGHLIGHTED = 'bp-is-text-highlighted';
export const CLASS_ANNOTATION_POINT = 'bp-show-point-annotation-btn';
export const CLASS_ANNOTATION_POINT_ICON = 'bp-point-annotation-icon';
export const CLASS_ANNOTATION_POINT_MODE = 'bp-point-annotation-mode';
export const CLASS_ANNOTATION_DRAW_MODE = 'bp-draw-annotation-mode';
export const CLASS_ANNOTATION_TEXTAREA = 'annotation-textarea';
export const CLASS_BUTTON_CONTAINER = 'button-container';
export const CLASS_BUTTON_DELETE_COMMENT = 'delete-comment-btn';
export const CLASS_CANNOT_ANNOTATE = 'cannot-annotate';
export const CLASS_COMMENTS_CONTAINER = 'annotation-comments';
export const CLASS_ANNOTATION_CONTAINER = 'annotation-container';
export const CLASS_REPLY_CONTAINER = 'reply-container';
export const CLASS_REPLY_TEXTAREA = 'reply-textarea';
export const CLASS_ANNOTATION_LAYER_HIGHLIGHT = 'bp-annotation-layer-highlight';
export const CLASS_ANNOTATION_LAYER_DRAW = 'bp-annotation-layer-draw';

export const SELECTOR_ANNOTATION_BUTTON_CANCEL = `.${CLASS_ANNOTATION_BUTTON_CANCEL}`;
export const SELECTOR_ANNOTATION_BUTTON_POST = `.${CLASS_ANNOTATION_BUTTON_POST}`;
export const SELECTOR_ANNOTATION_POINT = `.${CLASS_ANNOTATION_POINT}`;
export const SELECTOR_ANNOTATION_POINT_ICON = `.${CLASS_ANNOTATION_POINT_ICON}`;
export const SELECTOR_ANNOTATION_TEXTAREA = `.${CLASS_ANNOTATION_TEXTAREA}`;
export const SELECTOR_BUTTON_CONTAINER = `.${CLASS_BUTTON_CONTAINER}`;
export const SELECTOR_BUTTON_DELETE_COMMENT = `.${CLASS_BUTTON_DELETE_COMMENT}`;
export const SELECTOR_COMMENTS_CONTAINER = `.${CLASS_COMMENTS_CONTAINER}`;
export const SELECTOR_REPLY_CONTAINER = `.${CLASS_REPLY_CONTAINER}`;
export const SELECTOR_REPLY_TEXTAREA = `.${CLASS_REPLY_TEXTAREA}`;
export const SELECTOR_ANNOTATION_LAYER_HIGHLIGHT = `.${CLASS_ANNOTATION_LAYER_HIGHLIGHT}`;
export const SELECTOR_ANNOTATION_LAYER_DRAW = `.${CLASS_ANNOTATION_LAYER_DRAW}`;

export const ANNOTATION_STATE_HOVER = 'hover'; // mouse is over
export const ANNOTATION_STATE_INACTIVE = 'inactive'; // not clicked and mouse is not over
export const ANNOTATION_STATE_PENDING = 'pending'; // not saved
export const ANNOTATION_STATE_PENDING_ACTIVE = 'pending-active'; // not saved and pending comment
export const ANNOTATION_TYPE_POINT = 'point';
export const ANNOTATION_TYPE_DRAW = 'draw';
export const ANNOTATION_TYPE_HIGHLIGHT = 'highlight';
export const ANNOTATION_TYPE_HIGHLIGHT_COMMENT = 'highlight-comment';
export const PENDING_STATES = [ANNOTATION_STATE_PENDING, ANNOTATION_STATE_PENDING_ACTIVE];

export const HIGHLIGHT_NORMAL_FILL_STYLE = 'rgba(254, 217, 78, 0.5)';
export const HIGHLIGHT_ACTIVE_FILL_STYLE = 'rgba(255, 201, 0, 0.5)';
export const HIGHLIGHT_ERASE_FILL_STYLE = 'rgba(255, 245, 132, 1)';

export const PAGE_PADDING_TOP = 15;
export const PAGE_PADDING_BOTTOM = 15;

export const DRAW_RENDER_THRESHOLD = 16.67; // 60 FPS target using 16.667ms/frame
export const DRAW_POINTER_DOWN = 0;
export const DRAW_POINTER_UP = 1;
export const DRAW_POINTER_ERASE = 2;
