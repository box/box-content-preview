// Kinds of logs that can be stored
export const LOG_CODES = {
    error: 'ERROR',
    encaught_error: 'UNCAUGHT_ERROR',
    warning: 'WARNING',
    info: 'INFO',
    metric: 'METRIC'
};

// Levels to set on the logger, to enable/disable printing to the console.
export const LOG_LEVELS = {
    error: 'error',
    warning: 'warning',
    info: 'info',
    silent: 'silent'
};

/* eslint-disable no-undef */
export const CLIENT_NAME = __NAME__;
export const CLIENT_VERSION = __VERSION__;
/* eslint-enable no-undef */
