const GLOBAL_LOGGERS = global.Box.PreviewLoggers || {};

// Number of loggers that have been created since start of session.
let loggerCount = 0;

/**
 * Add a logger instance to the global logger registry. Logger will be store as Logger<Number>.
 * <Number> being the number of logs created this session.
 *
 * @param {Logger} logger - A logger to register
 * @return {string} The name of the logger in the global registry.
 */
export function registerLogger(logger) {
    let name = `Logger${loggerCount}`;

    if (GLOBAL_LOGGERS[name]) {
        loggerCount += 1;
        name = `Logger${loggerCount}`;
    }

    GLOBAL_LOGGERS[name] = logger;
    loggerCount += 1;

    return name;
}

/**
 * Remove the desired logger from the global registry.
 *
 * @param {string} name - Name of the logger to remove.
 * @return {void}
 */
export function unregisterLogger(name) {
    if (!GLOBAL_LOGGERS[name]) {
        return;
    }

    delete GLOBAL_LOGGERS[name];
}

// Global access for all registered loggers
global.Box = global.Box || {};
global.Box.PreviewLoggers = GLOBAL_LOGGERS;
