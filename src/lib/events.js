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
    annotationsLoadFail: 'error_annotations_load',
    invalidCacheAttempt: 'error_invalid_file_for_cache',
    prefetchFile: 'error_prefetch_file',
    rateLimit: 'error_rate_limit',
    retriesExceeded: 'error_retries_exceeded',
    browserError: 'error_browser_thrown',
    notDownloadable: 'error_file_not_downloadable'
};

export const PREVIEW_LOAD_EVENT = '';
// Event fired from Preview with error details
export const PREVIEW_ERROR = 'preview_error';
// Event fired from Preview with performance metrics
export const PREVIEW_METRIC = 'preview_metric';
// Milestone events for loading performance
export const LOAD_METRIC = {
    previewLoadEvent: 'preview_load', // Event name for preview_metric events related to loading times.
    fileInfoTime: 'file_info_time', // Round trip time from file info request to received file info.
    convertTime: 'convert_time', // Time it took from receiving file info to being able to request the rep.
    downloadResponseTime: 'download_response_time', // Time it took for TTFB when requesting a rep.
    fullDocumentLoadTime: 'full_document_load_time' // How long it took to load the document so it could be previewed.
};
