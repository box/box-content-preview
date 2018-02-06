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
    error: 'error', // When an error occurs
    default: 'viewerevent' // The default viewer event
};

// Error codes logged by preview with "preview_error" events
export const ERROR_CODE = {
    annotationsLoadFail: 'error_annotations_load',
    invalidCacheAttempt: 'error_invalid_file_for_cache',
    prefetchFile: 'error_prefetch_file',
    rateLimit: 'error_rate_limit',
    retriesExceeded: 'error_retries_exceeded',
    browserError: 'error_browser_thrown'
};
