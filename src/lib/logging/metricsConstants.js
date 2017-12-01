// Names that correspond to an action that requires a metric to be recorded

// Initial file preview metrics. See Preview.js 'load' event, 'metrics' property
export const METRIC_FILE_PREVIEW_SUCCESS = 'file_preview_success';
export const METRIC_FILE_PREVIEW_FAIL = 'file_preview_fail';

// User aborted preview before it could load
export const METRIC_FILE_PREVIEW_ABORTED = 'file_preview_aborted';

// Interaction with Preview controls
export const METRIC_CONTROL = 'preview_controls';

export const METRIC_CONTROL_ACTIONS = {
    zoom_in_button: 'zoom_in_button',
    zoom_in_pointer: 'zoom_in_pointer',
    zoom_out_button: 'zoom_out_button',
    zoom_out_pointer: 'zoom_out_pointer',
    navigate_prev_button: 'navigate_prev_button',
    navigate_prev_key: 'navigate_prev_key',
    navigate_next_button: 'navigate_next_button',
    navigate_next_key: 'navigate_next_key'
};
