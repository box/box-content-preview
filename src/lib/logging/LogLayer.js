import { LOG_TYPES, CONSOLE_LEVELS } from './logConstants';
import { arrayToString } from './logUtils';

// By default, print nothing.
const DEFAULT_CONSOLE_LEVEL = CONSOLE_LEVELS.silent;

/**
 * Abstraction layer for communicating with a global logging
 * mechanism and for creating Resin Events. Also gates what is printed
 * to the console.
 */
export default class LogLayer {
    /** @property {CONSOLE_LEVELS} - Level of logging allowed to the console */
    consoleLevel = DEFAULT_CONSOLE_LEVEL;

    /** @property {Object} - Reference to the global Box Logger object */
    loggerRef;

    /** @property {Object} - Reference to the global Resin object */
    resinRef;

    /**
     * @constructor
     *
     * @param {Object} config - Configures log level and network layer.
     * @param {CONSOLE_LEVELS|string} [config.consoleLevel] - Level to set for writing to the browser console.
     */
    constructor(config = {}) {
        const { consoleLevel } = config;
        if (consoleLevel) {
            this.setConsoleLevel(consoleLevel);
        }
    }

    /**
     * Sets the current level of messages to be logged to the console.
     *
     * @public
     * @param {CONSOLE_LEVELS|string} level - The level of logging to log to console.
     * @return {void}
     */
    setConsoleLevel(level) {
        this.consoleLevel = level;
    }

    /**
     * Log an info message to the logger, and commit to the cache.
     *
     * @public
     * @param {*} args - Arguments to be printed to the log and cache.
     * @return {void}
     */
    info(...args) {
        const message = arrayToString(args);
        this.commitToLogger(LOG_TYPES.info, message);
    }

    /**
     * Log a warning message to the logger, and commit to the cache.
     *
     * @public
     * @param {*} args - Arguments to be printed to the log and cache.
     * @return {void}
     */
    warn(...args) {
        const message = arrayToString(args);
        this.commitToLogger(LOG_TYPES.warning, message);
    }

    /**
     * Log an error message to the logger, and commit to the cache.
     *
     * @public
     * @param {*} args - Arguments to be printed to the log and cache.
     * @return {void}
     */
    error(...args) {
        const message = arrayToString(args);
        this.commitToLogger(LOG_TYPES.error, message);
    }

    /**
     * Log a metric message to the logger, and commit to the cache.
     *
     * @public
     * @param {string} eventName - Name associated with a specific metric.
     * @param {*} value - Value of the metric
     * @return {void}
     */
    metric(eventName, value) {
        this.commitToLogger(LOG_TYPES.metric, {
            eventName,
            value
        });
    }

    //--------------------------------------------------------
    // PRIVATE
    //--------------------------------------------------------

    /**
     * Maps logging type to a logging function in our third-party logger. Defaults
     * to regular 'info' if nothing available.
     *
     * @private
     * @param {LOG_TYPES|string} type - The log type to lookup a corresponding function on the logger.
     * @return {Function} A function that can be invoked with a string, to log a message.
     */
    getLoggerFunction(type) {
        let logFunction;
        /* eslint-disable no-console */
        switch (type) {
            case LOG_TYPES.warning:
                logFunction = console.warn;
                break;
            case LOG_TYPES.error:
            case LOG_TYPES.uncaught_error:
                logFunction = console.error;
                break;
            case LOG_TYPES.info:
                logFunction = console.log;
                break;
            default:
                logFunction = null;
        }
        /* eslint-enable no-console */

        return logFunction;
    }

    /**
     * Determine whether or not we can print to the console, based on consoleLevel.
     *
     * @private
     * @param {LOG_TYPES} type - Type of log to check.
     * @return {boolean} True if we can print to the console.
     */
    canPrintLog(type) {
        let typeValue;

        switch (type) {
            case LOG_TYPES.warning:
                typeValue = CONSOLE_LEVELS.warning;
                break;
            case LOG_TYPES.error:
            case LOG_TYPES.uncaught_error:
                typeValue = CONSOLE_LEVELS.error;
                break;
            case LOG_TYPES.info:
            default:
                typeValue = CONSOLE_LEVELS.info;
        }

        return this.consoleLevel <= typeValue;
    }

    /**
     * Check to see if the global logger exists, and create a reference to it.
     *
     * @return {boolean} True if a global Box Logger exists.
     */
    boxLoggerExists() {
        this.loggerRef = global.Box.Logger;
        return !!this.loggerRef;
    }

    /**
     * Check to see if Resing exists, and create a reference to it.
     *
     * @return {boolean} True if a global Resin instance exists.
     */
    resinExists() {
        this.resinRef = global.Resin;
        return !!this.resinRef;
    }

    /**
     * Commit a message to the logger
     */
    commitToLogger() {
        if (!this.boxLoggerExists()) {
            return;
        }

        this.loggerRef.commitMessage('derp');
    }
}
