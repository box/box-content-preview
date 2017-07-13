export const CLASS_ANNOTATION_BUTTON_CANCEL = 'cancel-annotation-btn';
export const CLASS_ANNOTATION_BUTTON_POST = 'post-annotation-btn';
export const CLASS_ANNOTATION_DIALOG = 'bp-annotation-dialog';
export const CLASS_ANNOTATION_HIGHLIGHT_DIALOG = 'bp-annotation-highlight-dialog';
export const CLASS_ANNOTATION_POINT_BUTTON = 'bp-point-annotation-btn';
export const CLASS_ANNOTATION_POINT_MODE = 'bp-point-annotation-mode';
export const CLASS_ANNOTATION_DRAW_MODE = 'bp-draw-annotation-mode';
export const CLASS_ANNOTATION_CARET = 'bp-annotation-caret';
export const CLASS_ANNOTATION_TEXTAREA = 'annotation-textarea';
export const CLASS_BUTTON_CONTAINER = 'button-container';
export const CLASS_ANNOTATION_CONTAINER = 'annotation-container';
export const CLASS_MOBILE_ANNOTATION_DIALOG = 'bp-mobile-annotation-dialog';
export const CLASS_MOBILE_DIALOG_HEADER = 'bp-annotation-mobile-header';
export const CLASS_DIALOG_CLOSE = 'bp-annotation-dialog-close';
export const CLASS_TEXTAREA = 'bp-textarea';
export const CLASS_HIGHLIGHT_BTNS = 'bp-annotation-highlight-btns';
export const CLASS_ADD_HIGHLIGHT_BTN = 'bp-add-highlight-btn';
export const CLASS_ADD_HIGHLIGHT_COMMENT_BTN = 'bp-highlight-comment-btn';
export const CLASS_ANNOTATION_LAYER_HIGHLIGHT = 'bp-annotation-layer-highlight';

export const DATA_TYPE_ANNOTATION_DIALOG = 'annotation-dialog';
export const DATA_TYPE_ANNOTATION_INDICATOR = 'annotation-indicator';

export const SECTION_CREATE = '[data-section="create"]';
export const SECTION_SHOW = '[data-section="show"]';

export const SELECTOR_ANNOTATION_BUTTON_CANCEL = `.${CLASS_ANNOTATION_BUTTON_CANCEL}`;
export const SELECTOR_ANNOTATION_BUTTON_POST = `.${CLASS_ANNOTATION_BUTTON_POST}`;
export const SELECTOR_ANNOTATION_DIALOG = `.${CLASS_ANNOTATION_DIALOG}`;
export const SELECTOR_ANNOTATION_HIGHLIGHT_DIALOG = `.${CLASS_ANNOTATION_HIGHLIGHT_DIALOG}`;
export const SELECTOR_ANNOTATION_POINT_BUTTON = `.${CLASS_ANNOTATION_POINT_BUTTON}`;
export const SELECTOR_ANNOTATION_POINT_MODE = `.${CLASS_ANNOTATION_POINT_MODE}`;
export const SELECTOR_ANNOTATION_CARET = `.${CLASS_ANNOTATION_CARET}`;
export const SELECTOR_ANNOTATION_TEXTAREA = `.${CLASS_ANNOTATION_TEXTAREA}`;
export const SELECTOR_BUTTON_CONTAINER = `.${CLASS_BUTTON_CONTAINER}`;
export const SELECTOR_ANNOTATION_CONTAINER = `.${CLASS_ANNOTATION_CONTAINER}`;
export const SELECTOR_MOBILE_ANNOTATION_DIALOG = `.${CLASS_MOBILE_ANNOTATION_DIALOG}`;
export const SELECTOR_MOBILE_DIALOG_HEADER = `.${CLASS_MOBILE_DIALOG_HEADER}`;
export const SELECTOR_DIALOG_CLOSE = `.${CLASS_DIALOG_CLOSE}`;
export const SELECTOR_HIGHLIGHT_BTNS = `.${CLASS_HIGHLIGHT_BTNS}`;
export const SELECTOR_ADD_HIGHLIGHT_BTN = `.${CLASS_ADD_HIGHLIGHT_BTN}`;

export const STATES = {
    hover: 'hover', // mouse is over
    inactive: 'inactive', // not clicked and mouse is not over
    pending: 'pending', // not saved
    pending_active: 'pending-active' // not saved and pending comment
};
export const PENDING_STATES = [STATES.pending, STATES.pending_active];

export const TYPES = {
    point: 'point',
    highlight: 'highlight',
    draw: 'draw',
    highlight_comment: 'highlight-comment'
};

export const HIGHLIGHT_FILL = {
    normal: 'rgba(254, 217, 78, 0.5)',
    active: 'rgba(255, 201, 0, 0.5)',
    erase: 'rgba(255, 245, 132, 1)'
};

export const PAGE_PADDING_TOP = 15;
export const PAGE_PADDING_BOTTOM = 15;

export const DRAW_RENDER_THRESHOLD = 16.67; // 60 FPS target using 16.667ms/frame
export const DRAW_POINTER_DOWN = 0;
export const DRAW_POINTER_UP = 1;
export const DRAW_POINTER_ERASE = 2;
