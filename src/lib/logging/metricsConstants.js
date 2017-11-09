// Codes that correspond to an action that requires a metric to be recorded

// Initial file preview metrics. See Preview.js 'load' event, 'metrics' property
export const METRIC_FILE_PREVIEW_SUCCESS = 1;
export const METRIC_FILE_PREVIEW_FAIL = 2;

// Interaction with Preview controls
export const METRIC_CONTROLS = 3;

export const METRIC_CONTROL_ACTIONS = {
    zoom_in_button: 1,
    zoom_in_pointer: 2,
    zoom_out_button: 3,
    zoom_out_pointer: 4,
    navigate_prev_button: 5,
    navigate_prev_key: 6,
    navigate_next_button: 7,
    navigate_next_key: 8
};
