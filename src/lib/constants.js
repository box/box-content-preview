export const CLASS_ACTIVE = 'bp-is-active';
export const CLASS_NAVIGATION_VISIBILITY = 'bp-is-navigation-visible';
export const CLASS_HIDDEN = 'bp-is-hidden';
export const CLASS_PREVIEW_LOADED = 'bp-loaded';
export const CLASS_BOX_PREVIEW = 'bp';
export const CLASS_BOX_PREVIEW_BUTTON = 'bp-btn';
export const CLASS_BOX_PREVIEW_CONTAINER = 'bp-container';
export const CLASS_BOX_PREVIEW_FIND_BAR = 'bp-find-bar';
export const CLASS_BOX_PREVIEW_HAS_HEADER = 'bp-has-header';
export const CLASS_BOX_PREVIEW_HEADER = 'bp-header';
export const CLASS_BOX_PREVIEW_HEADER_BTNS = 'bp-header-btns';
export const CLASS_BOX_PREVIEW_ICON = 'bp-icon';
export const CLASS_BOX_PREVIEW_LINK = 'bp-link';
export const CLASS_BOX_PREVIEW_LOADING_TEXT = 'bp-loading-text';
export const CLASS_BOX_PREVIEW_LOADING_WRAPPER = 'bp-loading-wrapper';
export const CLASS_BOX_PREVIEW_LOGO_CUSTOM = 'bp-custom-logo';
export const CLASS_BOX_PREVIEW_LOGO_DEFAULT = 'bp-default-logo';
export const CLASS_BOX_PREVIEW_MENU = 'bp-menu';
export const CLASS_BOX_PREVIEW_MOBILE = 'bp-is-mobile';
export const CLASS_BOX_PREVIEW_OVERLAY = 'bp-overlay';
export const CLASS_BOX_PREVIEW_OVERLAY_WRAPPER = 'bp-overlay-wrapper';
export const CLASS_BOX_PREVIEW_PRELOAD = 'bp-preload';
export const CLASS_BOX_PREVIEW_PRELOAD_CONTENT = 'bp-preload-content';
export const CLASS_BOX_PREVIEW_PRELOAD_WRAPPER_DOCUMENT = 'bp-document-preload-wrapper';
export const CLASS_BOX_PREVIEW_PRELOAD_WRAPPER_PRESENTATION = 'bp-presentation-preload-wrapper';
export const CLASS_BOX_PREVIEW_PROGRESS_BAR = 'bp-progress-bar';
export const CLASS_BOX_PREVIEW_PROGRESS_BAR_CONTAINER = 'bp-progress-bar-container';
export const CLASS_BOX_PREVIEW_TOGGLE_OVERLAY = 'bp-toggle-overlay';
export const CLASS_BOX_PREVIEW_THEME_DARK = 'bp-theme-dark';
export const CLASS_ELEM_KEYBOARD_FOCUS = 'bp-has-keyboard-focus';
export const CLASS_FULLSCREEN = 'bp-is-fullscreen';
export const CLASS_FULLSCREEN_UNSUPPORTED = 'bp-fullscreen-unsupported';
export const CLASS_INVISIBLE = 'bp-is-invisible';
export const CLASS_IS_VISIBLE = 'bp-is-visible';
export const CLASS_IS_SCROLLABLE = 'bp-is-scrollable';
export const CLASS_IS_SELECTABLE = 'bp-is-selectable';
export const CLASS_IS_BUFFERING = 'bp-is-buffering';
export const CLASS_DARK = 'bp-dark';

export const SELECTOR_BOX_PREVIEW_CONTAINER = `.${CLASS_BOX_PREVIEW_CONTAINER}`;
export const SELECTOR_BOX_PREVIEW = `.${CLASS_BOX_PREVIEW}`;
export const SELECTOR_BOX_PREVIEW_CRAWLER_WRAPPER = '.bp-crawler-wrapper';
export const SELECTOR_BOX_PREVIEW_HEADER_BTNS = `.${CLASS_BOX_PREVIEW_HEADER_BTNS}`;
export const SELECTOR_NAVIGATION_LEFT = '.bp-navigate-left';
export const SELECTOR_NAVIGATION_RIGHT = '.bp-navigate-right';
export const SELECTOR_BOX_PREVIEW_BTN_ANNOTATE_POINT = '.bp-btn-annotate-point';
export const SELECTOR_BOX_PREVIEW_BTN_ANNOTATE_DRAW = '.bp-btn-annotate-draw';
export const SELECTOR_BOX_PREVIEW_BTN_PRINT = '.bp-btn-print';
export const SELECTOR_BOX_PREVIEW_BTN_DOWNLOAD = '.bp-btn-download';
export const SELECTOR_BOX_PREVIEW_BTN_LOADING_DOWNLOAD = '.bp-btn-loading-download';
export const SELECTOR_BOX_PREVIEW_HEADER = `.${CLASS_BOX_PREVIEW_HEADER}`;
export const SELECTOR_BOX_PREVIEW_ICON = `.${CLASS_BOX_PREVIEW_ICON}`;
export const SELECTOR_BOX_PREVIEW_LOADING_TEXT = `.${CLASS_BOX_PREVIEW_LOADING_TEXT}`;
export const SELECTOR_BOX_PREVIEW_LOADING_WRAPPER = `.${CLASS_BOX_PREVIEW_LOADING_WRAPPER}`;
export const SELECTOR_BOX_PREVIEW_LOGO_CUSTOM = `.${CLASS_BOX_PREVIEW_LOGO_CUSTOM}`;
export const SELECTOR_BOX_PREVIEW_LOGO_DEFAULT = `.${CLASS_BOX_PREVIEW_LOGO_DEFAULT}`;
export const SELECTOR_BOX_PREVIEW_PROGRESS_BAR = `.${CLASS_BOX_PREVIEW_PROGRESS_BAR}`;

export const PERMISSION_DOWNLOAD = 'can_download';
export const PERMISSION_ANNOTATE = 'can_annotate';
export const PERMISSION_PREVIEW = 'can_preview';

export const API_HOST = 'https://api.box.com';
export const APP_HOST = 'https://app.box.com';

export const ORIGINAL_REP_NAME = 'ORIGINAL';
export const PRELOAD_REP_NAME = 'jpg';

export const STATUS_ERROR = 'error';
export const STATUS_SUCCESS = 'success';
export const STATUS_VIEWABLE = 'viewable';

// X-Rep-Hints for Representations API
export const X_REP_HINT_BASE = '[3d][pdf][text][mp3]';
export const X_REP_HINT_DOC_THUMBNAIL = '[jpg?dimensions=1024x1024&paged=false]';
export const X_REP_HINT_IMAGE = '[jpg?dimensions=2048x2048,png?dimensions=2048x2048]';
export const X_REP_HINT_VIDEO_DASH = '[dash,mp4][filmstrip]';
export const X_REP_HINT_VIDEO_MP4 = '[mp4]';

// These should be updated to match the Preview version in package.json
// whenever a file in that third party directory is updated
export const DOC_STATIC_ASSETS_VERSION = '0.130.0';
export const MEDIA_STATIC_ASSETS_VERSION = '1.5.1';
export const MODEL3D_STATIC_ASSETS_VERSION = '1.4.1';
export const SWF_STATIC_ASSETS_VERSION = '0.112.0';
export const TEXT_STATIC_ASSETS_VERSION = '0.114.0';

//  Maps file extension to error message.
export const FILE_EXT_ERROR_MAP = {
    numbers: __('error_iwork'),
    pages: __('error_iwork'),
    key: __('error_iwork')
};

export const PREVIEW_SCRIPT_NAME = 'preview.js';
