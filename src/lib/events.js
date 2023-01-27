// Events emitted by Viewers
export const VIEWER_EVENT = {
    default: 'viewerevent', // The default viewer event.
    download: 'download', // Begin downloading the file.
    error: 'error', // When an error occurs.
    load: 'load', // Preview is finished loading.
    mediaEndAutoplay: 'mediaendautoplay', // Media playback has completed, with autoplay enabled.
    metric: 'viewermetric', // A viewer metric.
    notificationHide: 'notificationhide', // Hide notification modal.
    notificationShow: 'notificationshow', // Show notification modal.
    printSuccess: 'printsuccess', // When printing is successful
    reload: 'reload', // Reload preview.
    thumbnailsClose: 'thumbnailsClose', // When thumbnails sidebar closes
    thumbnailsOpen: 'thumbnailsOpen', // When thumbnails sidebar opens
};

// Error codes logged by preview with "preview_error" events
export const ERROR_CODE = {
    ACCOUNT: 'error_account',
    BAD_INPUT: 'error_bad_input',
    BROWSER_GENERIC: 'error_browser_generic',
    BROWSER_UNSUPPORTED: 'error_browser_unsupported',
    CONTENT_DOWNLOAD: 'error_content_download',
    CONVERSION_FAILED: 'error_conversion_failed',
    CONVERSION_GENERIC: 'error_conversion_generic',
    CONVERSION_PASSWORD_PROTECTED: 'error_password_protected',
    CONVERSION_TRY_AGAIN_LATER: 'error_try_again_later',
    CONVERSION_UNSUPPORTED_FORMAT: 'error_unsupported_format',
    DELETED_REPS: 'error_deleted_reps',
    EXCEEDED_RETRY_LIMIT: 'error_exceeded_retry_limit',
    FLASH_NOT_ENABLED: 'error_flash_not_enabled',
    GENERIC: 'error_generic',
    IMAGE_SIZING: 'error_image_sizing',
    INVALID_CACHE_ATTEMPT: 'error_invalid_file_for_cache',
    LOAD_ANNOTATIONS: 'error_load_annotations',
    LOAD_ASSET: 'error_load_asset',
    LOAD_CSV: 'error_load_csv',
    LOAD_DOCUMENT: 'error_load_document',
    LOAD_MEDIA: 'error_load_media',
    LOAD_VIEWER: 'error_load_viewer',
    NOT_DOWNLOADABLE: 'error_file_not_downloadable',
    PARSE_CSV: 'error_parse_csv',
    PERMISSIONS_PREVIEW: 'error_permissions_preview',
    PREFETCH_FILE: 'error_prefetch_file',
    RATE_LIMIT: 'error_rate_limit',
    SHAKA: 'error_shaka',
    TOKEN_NOT_VALID: 'error_token_function_not_valid',
    UNSUPPORTED_FILE_TYPE: 'error_unsupported_file_type',
    VIEWER_LOAD_TIMEOUT: 'error_viewer_load_timeout',
};

// Event fired from Preview with error details
export const PREVIEW_ERROR = 'preview_error';
// Event fired from Preview with performance metrics
export const PREVIEW_METRIC = 'preview_metric';
// Milestone events for loading performance
export const LOAD_METRIC = {
    contentLoadTime: 'full_document_load_time', // How long it took to load the document so it could be previewed.
    convertTime: 'convert_time', // Time it took from receiving file info to being able to request the rep.
    downloadResponseTime: 'download_response_time', // Time it took for TTFB when requesting a rep.
    fileInfoTime: 'file_info_time', // Round trip time from file info request to received file info.
    preloadTime: 'preload_time', // How long it takes to preload the document.
    previewLoadEvent: 'load', // Event name for preview_metric events related to loading times.
    previewLoadTime: 'preview_loading', // Total preview load time. Maps to "value" of load event
    previewPreloadEvent: 'preload', // Event name for preview_metrics based on preload times.
};
// Event fired from preview based on when the content was actually shown
export const RENDER_EVENT = 'preview_render';
export const RENDER_METRIC = 'preview_render_metric';

// Event fired from preview with preview duration metrics
export const DURATION_METRIC = 'preview_duration_metric';
export const PREVIEW_END_EVENT = 'preview_end';

// Event fired when the user attempts to download the file
export const PREVIEW_DOWNLOAD_ATTEMPT_EVENT = 'preview_download_attempt';
// Events around download reachability
export const DOWNLOAD_REACHABILITY_METRICS = {
    DOWNLOAD_BLOCKED: 'dl_reachability_host_blocked',
    NOTIFICATION_SHOWN: 'dl_reachability_notification_shown',
};
// Events fired when using find in preview
export const USER_DOCUMENT_FIND_EVENTS = {
    NEXT: 'user_document_find_next', // The user navigates to the next find entry
    OPEN: 'user_document_find_open', // The user opens the find bar
    PREVIOUS: 'user_document_find_previous', // The user navigates to the previous find entry
};

// Events fired when using thumbnail sidebar
export const USER_DOCUMENT_THUMBNAIL_EVENTS = {
    CLOSE: 'user_document_thumbnails_close',
    NAVIGATE: 'user_document_thumbnails_navigate',
    OPEN: 'user_document_thumbnails_open',
};

export const MISSING_EXTERNAL_REFS = 'missing_x_refs';

export const MEDIA_METRIC = {
    bufferFill: 'bufferFill',
    duration: 'duration',
    lagRatio: 'lagRatio',
    seeked: 'seeked',
    totalBufferLag: 'totalBufferLag',
    watchLength: 'watchLength',
};

export const MEDIA_METRIC_EVENTS = {
    bufferFill: 'media_metric_buffer_fill',
    endPlayback: 'media_metric_end_playback',
};

export const REPORT_ACI = 'advanced_insights_report';
