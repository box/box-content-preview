export const CLASS_ACTIVE = 'bp-is-active';
export const CLASS_ANNOTATIONS_CREATE_DRAWING = 'bp-annotations-create--drawing';
export const CLASS_ANNOTATIONS_CREATE_HIGHLIGHT = 'bp-annotations-create--highlight';
export const CLASS_ANNOTATIONS_CREATE_REGION = 'bp-annotations-create--region';
export const CLASS_ANNOTATIONS_DISCOVERABLE = 'bp-annotations-discoverable';
export const CLASS_ANNOTATIONS_ONLY_CONTROLS = 'bp-annotations-only-controls';
export const CLASS_ANNOTATIONS_IMAGE_FTUX_CURSOR_SEEN = 'bp-annotations-ftux-image-cursor-seen';
export const CLASS_ANNOTATIONS_DOCUMENT_FTUX_CURSOR_SEEN = 'bp-annotations-ftux-document-cursor-seen';
export const CLASS_NAVIGATION_VISIBILITY = 'bp-is-navigation-visible';
export const CLASS_HIDDEN = 'bp-is-hidden';
export const CLASS_PREVIEW_LOADED = 'bp-loaded';
export const CLASS_BOX_PREVIEW = 'bp';
export const CLASS_BOX_PREVIEW_BUTTON = 'bp-btn';
export const CLASS_BOX_PREVIEW_CONTAINER = 'bp-container';
export const CLASS_BOX_PREVIEW_CONTENT = 'bp-content';
export const CLASS_BOX_PREVIEW_FIND_BAR = 'bp-find-bar';
export const CLASS_BOX_PREVIEW_HAS_HEADER = 'bp-has-header';
export const CLASS_BOX_PREVIEW_HAS_NAVIGATION = 'bp-has-navigation';
export const CLASS_BOX_PREVIEW_HEADER = 'bp-header';
export const CLASS_BOX_PREVIEW_HEADER_CONTAINER = 'bp-header-container';
export const CLASS_BOX_PREVIEW_BASE_HEADER = 'bp-base-header';
export const CLASS_BOX_PREVIEW_ICON = 'bp-icon';
export const CLASS_BOX_PREVIEW_LINK = 'bp-link';
export const CLASS_BOX_PREVIEW_LOGO_CUSTOM = 'bp-custom-logo';
export const CLASS_BOX_PREVIEW_LOGO_DEFAULT = 'bp-default-logo';
export const CLASS_BOX_PREVIEW_MENU = 'bp-menu';
export const CLASS_BOX_PREVIEW_MOBILE = 'bp-is-mobile';
export const CLASS_BOX_PREVIEW_OVERLAY = 'bp-overlay';
export const CLASS_BOX_PREVIEW_OVERLAY_WRAPPER = 'bp-overlay-wrapper';
export const CLASS_BOX_PREVIEW_PRELOAD = 'bp-preload';
export const CLASS_BOX_PREVIEW_PRELOAD_CONTENT = 'bp-preload-content';
export const CLASS_BOX_PRELOAD_COMPLETE = 'bp-preload-complete';
export const CLASS_BOX_PREVIEW_PRELOAD_OVERLAY = 'bp-preload-overlay';
export const CLASS_BOX_PREVIEW_PRELOAD_PLACEHOLDER = 'bp-preload-placeholder';
export const CLASS_BOX_PREVIEW_PRELOAD_WRAPPER_DOCUMENT = 'bp-document-preload-wrapper';
export const CLASS_BOX_PREVIEW_PRELOAD_WRAPPER_PRESENTATION = 'bp-presentation-preload-wrapper';
export const CLASS_BOX_PREVIEW_NOTIFICATION = 'bp-notification';
export const CLASS_BOX_PREVIEW_NOTIFICATION_WRAPPER = 'bp-notifications-wrapper';
export const CLASS_BOX_PREVIEW_TOGGLE_OVERLAY = 'bp-toggle-overlay';
export const CLASS_BOX_PREVIEW_THEME_DARK = 'bp-theme-dark';
export const CLASS_BOX_PREVIEW_THUMBNAILS_CLOSE = 'bp-thumbnails-close';
export const CLASS_BOX_PREVIEW_THUMBNAILS_CLOSE_ACTIVE = 'bp-thumbnails-close-active';
export const CLASS_BOX_PREVIEW_THUMBNAILS_CONTAINER = 'bp-thumbnails-container';
export const CLASS_BOX_PREVIEW_THUMBNAILS_OPEN = 'bp-thumbnails-open';
export const CLASS_BOX_PREVIEW_THUMBNAILS_OPEN_ACTIVE = 'bp-thumbnails-open-active';
export const CLASS_ELEM_KEYBOARD_FOCUS = 'bp-has-keyboard-focus';
export const CLASS_FULLSCREEN = 'bp-is-fullscreen';
export const CLASS_FULLSCREEN_UNSUPPORTED = 'bp-fullscreen-unsupported';
export const CLASS_MULTI_IMAGE_PAGE = 'bp-multi-image-page';
export const CLASS_INVISIBLE = 'bp-is-invisible';
export const CLASS_IS_TRANSPARENT = 'bp-is-transparent';
export const CLASS_IS_VISIBLE = 'bp-is-visible';
export const CLASS_IS_PRINTABLE = 'bp-is-printable';
export const CLASS_IS_SCROLLABLE = 'bp-is-scrollable';
export const CLASS_IS_SELECTABLE = 'bp-is-selectable';
export const CLASS_IS_BUFFERING = 'bp-is-buffering';
export const CLASS_DARK = 'bp-dark';
export const CLASS_DOC_FIRST_IMAGE = 'doc-first-image';
export const CLASS_CRAWLER = 'bp-crawler';
export const CLASS_PREFETCHED_IMAGE = 'bp-prefetched-image';

export const DISCOVERABILITY_ATTRIBUTE = 'data-resin-discoverability';

export const SELECTOR_BOX_PREVIEW_CONTAINER = `.${CLASS_BOX_PREVIEW_CONTAINER}`;
export const SELECTOR_BOX_PREVIEW = `.${CLASS_BOX_PREVIEW}`;
export const SELECTOR_BOX_PREVIEW_CONTENT = `.${CLASS_BOX_PREVIEW_CONTENT}`;
export const SELECTOR_NAVIGATION_LEFT = '.bp-navigate-left';
export const SELECTOR_NAVIGATION_RIGHT = '.bp-navigate-right';
export const SELECTOR_BOX_PREVIEW_BTN_ANNOTATE_POINT = '.bp-btn-annotate-point';
export const SELECTOR_BOX_PREVIEW_BTN_ANNOTATE_DRAW = '.bp-btn-annotate-draw';
export const SELECTOR_BOX_PREVIEW_BTN_PRINT = '.bp-btn-print';
export const SELECTOR_BOX_PREVIEW_BTN_DOWNLOAD = '.bp-btn-download';
export const SELECTOR_BOX_PREVIEW_HEADER = `.${CLASS_BOX_PREVIEW_HEADER}`;
export const SELECTOR_BOX_PREVIEW_HEADER_CONTAINER = `.${CLASS_BOX_PREVIEW_HEADER_CONTAINER}`;
export const SELECTOR_BOX_PREVIEW_ICON = `.${CLASS_BOX_PREVIEW_ICON}`;
export const SELECTOR_BOX_PREVIEW_LOGO_CUSTOM = `.${CLASS_BOX_PREVIEW_LOGO_CUSTOM}`;
export const SELECTOR_BOX_PREVIEW_LOGO_DEFAULT = `.${CLASS_BOX_PREVIEW_LOGO_DEFAULT}`;
export const SELECTOR_BOX_PREVIEW_NOTIFICATION = `.${CLASS_BOX_PREVIEW_NOTIFICATION}`;

export const PERMISSION_DOWNLOAD = 'can_download';
export const PERMISSION_PREVIEW = 'can_preview';

export const API_HOST = 'https://api.box.com';
export const APP_HOST = 'https://app.box.com';

export const ORIGINAL_REP_NAME = 'ORIGINAL';
export const PRELOAD_REP_NAME = 'jpg';
export const PRELOAD_PAGED_REP_NAME = 'webp';
export const STATUS_ERROR = 'error';
export const STATUS_NONE = 'none';
export const STATUS_PENDING = 'pending';
export const STATUS_SUCCESS = 'success';
export const STATUS_VIEWABLE = 'viewable';

// X-Rep-Hints for Representations API
export const X_REP_HINT_BASE = '[3d][pdf][text][mp3][json]';
export const X_REP_HINT_DOC_THUMBNAIL = '[jpg?dimensions=1024x1024&paged=false]';
export const X_REP_HINT_IMAGE = '[jpg?dimensions=2048x2048,png?dimensions=2048x2048]';
export const X_REP_HINT_VIDEO_DASH = '[dash,mp4][filmstrip]';
export const X_REP_HINT_VIDEO_MP4 = '[mp4]';

export const PDFJS_CSS_UNITS = 96.0 / 72.0; // Should match CSS_UNITS in pdf_viewer.js
export const PDFJS_MAX_AUTO_SCALE = 1.25; // Should match MAX_AUTO_SCALE in pdf_viewer.js
export const PDFJS_WIDTH_PADDING_PX = 40; // Should match SCROLLBAR_PADDING in pdf_viewer.js
export const PDFJS_HEIGHT_PADDING_PX = 5; // Should match VERTICAL_PADDING in pdf_viewer.js

export const DOC_STATIC_ASSETS_VERSION = '2.107.0';
export const MEDIA_STATIC_ASSETS_VERSION = '2.93.0';
export const MODEL3D_STATIC_ASSETS_VERSION = '1.12.0';
export const SWF_STATIC_ASSETS_VERSION = '0.112.0';
export const TEXT_STATIC_ASSETS_VERSION = '2.65.0';

export const PREVIEW_SCRIPT_NAME = 'preview.js';

export const FILE_OPTION_FILE_VERSION_ID = 'fileVersionId';
export const FILE_OPTION_START = 'startAt';

export const ANNOTATOR_EVENT = {
    modeEnter: 'annotationmodeenter',
    modeExit: 'annotationmodeexit',
    fetch: 'annotationsfetched',
    error: 'annotationerror',
    scale: 'scaleannotations',
    setColor: 'annotations_color_set',
    setVisibility: 'annotations_visible_set',
};

export const BROWSERS = {
    CHROME: 'Chrome',
    EDGE: 'Edge',
    FIREFOX: 'Firefox',
    INTERNET_EXPLORER: 'Explorer',
    OPERA: 'Opera',
    SAFARI: 'Safari',
};

export const METADATA = {
    FIELD_HASXREFS: 'hasxrefs',
    SCOPE_GLOBAL: 'global',
    TEMPLATE_AUTOCAD: 'autocad',
};

// Error Codes
export const ERROR_CODE_403_FORBIDDEN_BY_POLICY = 'forbidden_by_policy';

// LocalStorage Keys
export const DOCUMENT_FTUX_CURSOR_SEEN_KEY = 'ftux-cursor-seen-document';
export const IMAGE_FTUX_CURSOR_SEEN_KEY = 'ftux-cursor-seen-image';

export const SUBTITLES_OFF = -1;

export const VIDEO_PLAYER_CONTROL_BAR_HEIGHT = 120;

export const MEDIA_PLAYBACK_SKIP_DURATION = 5;
