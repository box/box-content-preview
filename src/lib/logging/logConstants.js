// Kinds of events that can be logged
export const LOG_TYPES = {
    error: 'error',
    uncaught_error: 'uncaught_error',
    warning: 'warning',
    info: 'info',
    metric: 'metric'
};

// Levels to set on the logger, to enable/disable printing to the console.
export const CONSOLE_LEVELS = {
    silent: 3,
    error: 2,
    warning: 1,
    info: 0
};

/* eslint-disable no-undef */
export const CLIENT_NAME = __NAME__;
export const CLIENT_VERSION = __VERSION__;
/* eslint-enable no-undef */
