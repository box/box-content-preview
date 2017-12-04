// Names that correspond to an action that requires a metric to be recorded

// Initial file preview metrics. See Preview.js 'load' event, 'metrics' property
export const METRIC_FILE_PREVIEW_SUCCESS = 'file_preview_success';
export const METRIC_FILE_PREVIEW_FAIL = 'file_preview_fail';

// User aborted preview before it could load
export const METRIC_FILE_PREVIEW_ABORTED = 'file_preview_aborted';

// Interaction with Preview controls
export const METRIC_CONTROL = 'preview_controls';

// General control actions
export const METRIC_CONTROL_ACTIONS = {
    zoom_in_button: 'zoom_in_button',
    zoom_in_pointer: 'zoom_in_pointer',
    zoom_out_button: 'zoom_out_button',
    zoom_out_pointer: 'zoom_out_pointer',
    navigate_prev_button: 'navigate_prev_button',
    navigate_prev_key: 'navigate_prev_key',
    navigate_next_button: 'navigate_next_button',
    navigate_next_key: 'navigate_next_key',
    toggle_fullscreen_button: 'toggle_fullscreen_button'
};

// Image preview controls
export const IMAGE_CONTROL_ACTIONS = {
    rotate_left_button: 'image_rotate_left_button'
};

// 3D preview controls
export const BOX3D_CONTROL_ACTIONS = {
    toggle_vr_button: '3d_toggle_vr_button',
    reset_button: '3d_reset_button'
};

// Error viewer
export const ERROR_CONTROL_ACTIONS = {
    download_button: 'error_download_button'
};
