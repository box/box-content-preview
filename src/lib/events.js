// Events emitted by Viewers
export const VIEWER_EVENT = {
    download: 'download', // Begin downloading the file.
    reload: 'reload', // Reload preview.
    load: 'load', // Preview is finished loading.
    progressStart: 'progressstart', // Begin using loading indicator.
    progressEnd: 'progressend', // Stop using loading indicator.
    notificationShow: 'notificationshow', // Show notification modal.
    notificationHide: 'notificationhide', // Hide notification modal.
    mediaEndAutoplay: 'mediaendautoplay', // Media playback has completed, with autoplay enabled.
    error: 'error', // When an error occurs.
    default: 'viewerevent', // The default viewer event.
    metric: 'viewermetric' // A viewer metric.
};

// Error codes logged by preview with "preview_error" events
export const ERROR_CODE = {
    ACCOUNT: 'error_account',
    UNSUPPORTED_FILE_TYPE: 'error_unsupported_file_type',
    PERMISSIONS_PREVIEW: 'error_permissions_preview',
    BAD_INPUT: 'error_bad_input',
    LOAD_ANNOTATIONS: 'error_load_annotations',
    LOAD_ASSET: 'error_load_asset',
    LOAD_CSV: 'error_load_csv',
    LOAD_DOCUMENT: 'error_load_document',
    LOAD_MEDIA: 'error_load_media',
    LOAD_VIEWER: 'error_load_viewer',
    IMAGE_SIZING: 'error_image_sizing',
    SHAKA: 'error_shaka',
    INVALID_CACHE_ATTEMPT: 'error_invalid_file_for_cache',
    PREFETCH_FILE: 'error_prefetch_file',
    RATE_LIMIT: 'error_rate_limit',
    EXCEEDED_RETRY_LIMIT: 'error_exceeded_retry_limit',
    BROWSER_GENERIC: 'error_browser_generic',
    BROWSER_UNSUPPORTED: 'error_browser_unsupported',
    NOT_DOWNLOADABLE: 'error_file_not_downloadable',
    GENERIC: 'error_generic',
    CONVERSION_GENERIC: 'error_conversion_generic',
    CONVERSION_PASSWORD_PROTECTED: 'error_password_protected',
    CONVERSION_TRY_AGAIN_LATER: 'error_try_again_later',
    CONVERSION_UNSUPPORTED_FORMAT: 'error_unsupported_format',
    VIEWER_LOAD_TIMEOUT: 'error_viewer_load_timeout',
    CONTENT_DOWNLOAD: 'error_content_download',
    FLASH_NOT_ENABLED: 'error_flash_not_enabled'
};

// Event fired from Preview with error details
export const PREVIEW_ERROR = 'preview_error';
// Event fired from Preview with performance metrics
export const PREVIEW_METRIC = 'preview_metric';
// Milestone events for loading performance
export const LOAD_METRIC = {
    previewLoadEvent: 'load', // Event name for preview_metric events related to loading times.
    previewPreloadEvent: 'preload', // Event name for preview_metrics based on preload times.
    fileInfoTime: 'file_info_time', // Round trip time from file info request to received file info.
    convertTime: 'convert_time', // Time it took from receiving file info to being able to request the rep.
    downloadResponseTime: 'download_response_time', // Time it took for TTFB when requesting a rep.
    contentLoadTime: 'full_document_load_time', // How long it took to load the document so it could be previewed.
    preloadTime: 'preload_time' // How long it takes to preload the document.
};

export const DURATION_METRIC = 'preview_duration_metric';
// Event fired from preview with preview duration metrics
export const PREVIEW_END_EVENT = 'preview_end';
// Event fired when the user attempts to download the file
export const PREVIEW_DOWNLOAD_ATTEMPT_EVENT = 'preview_download_attempt';
// Events around download reachability
export const DOWNLOAD_REACHABILITY_METRICS = {
    NOTIFICATION_SHOWN: 'dl_reachability_notification_shown',
    DOWNLOAD_BLOCKED: 'dl_reachability_host_blocked'
};
// Events fired when using find in preview
export const USER_DOCUMENT_FIND_EVENTS = {
    NEXT: 'user_document_find_next', // The user navigates to the next find entry
    OPEN: 'user_document_find_open', // The user opens the find bar
    PREVIOUS: 'user_document_find_previous' // The user navigates to the previous find entry
};
