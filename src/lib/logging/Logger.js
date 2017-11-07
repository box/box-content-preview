import * as LogLevel from 'loglevel';

import LoggerCache from './LoggerCache';
import { LOG_CODES } from './logConstants';

/**
 * Convert an array to a string, including nested objects.
 *
 * @param {Array} array - The array to convert to a string.
 * @return {string} The array as a string.
 */
function arrayToString(array) {
    if (!Array.isArray(array)) {
        throw new Error('Invalid arguments for logging. Not an Array.');
    }

    const lastIndex = array.length - 1;
    const message = array.reduce((accumulator, value, index) => {
        let parsedValue;

        if (Array.isArray(value)) {
            parsedValue = `[${arrayToString(value)}]`;
        } else if (typeof value === 'object') {
            parsedValue = JSON.stringify(value);
        } else {
            parsedValue = value;
        }

        // Add a comma if needed
        if (index < lastIndex) {
            parsedValue += ', ';
        }

        return accumulator + parsedValue;
    }, '');

    return message;
}

/**
 * 
 */
class Logger {
    /** @property {Object} - Instance of internal logger */
    logger;

    /** @property {LoggerCache} - Cache for storing and validating log messages */
    cache;

    /**
     * @constructor
     */
    constructor() {
        this.cache = new LoggerCache();
        this.logger = LogLevel.noConflict();

        this.onUncaughtError = this.onUncaughtError.bind(this);
        window.addEventListener('error', this.onUncaughtError);
    }

    /**
     * Destroys the logger.
     * 
     * @public
     * @return {void}
     */
    destroy() {
        this.cache.destroy();
        this.cache = null;
        this.logger = null;

        window.removeEventListener('error', this.onUncaughtError);
    }

    /**
     * Maps logging code to a logging function in our third-party logger. Defaults
     * to regular 'info' if nothing available.
     *
     * @private
     * @param {LOG_CODES|string} code - The log code to lookup a corresponding function on the logger.
     * @return {Function} A function that can be invoked with a string, to log a message.
     */
    getLoggerFunction(code) {
        let logFunction;

        switch (code) {
            case LOG_CODES.warning:
                logFunction = this.logger.warn;
                break;
            case LOG_CODES.error:
                logFunction = this.logger.error;
                break;
            case LOG_CODES.info:
            case LOG_CODES.metric:
            default:
                logFunction = this.logger.info;
        }

        return logFunction;
    }

    /**
     * Handler for uncaught errors. Logs and caches
     *
     * @private
     * @param {Error} error - Error object provided by the error event.
     * @return {void}
     */
    onUncaughtError(error) {
        this.error(error.message, '\n', error.error.stack);
    }

    /**
     * Commit a message to the cache and run the appropriate log function.
     *
     * @private
     * @param {LOG_CODES|string} code - The log code this belongs to.
     * @param {string} message - The message to log.
     * @return {void}
     */
    commitMessage(code, message = '') {
        const logFunction = this.getLoggerFunction(code);

        // Format message and add a timestamp
        const timestamp = new Date().toISOString();
        const formatted = `${timestamp} "${message}"`;

        this.cache.add(code, formatted);

        // Also wrapping the code into the message
        // #TODO(@jholdstock): abstract this step
        logFunction(`[${code}] ${formatted}`);
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
        this.commitMessage(LOG_CODES.info, message);
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
        this.commitMessage(LOG_CODES.warning, message);
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
        this.commitMessage(LOG_CODES.error, message);
    }

    /**
     * Log a metric message to the logger, and commit to the cache.
     *
     * @public
     * @param {*} args - Arguments to be printed to the log and cache.
     * @return {void}
     */
    metric(...args) {
        const message = arrayToString(args);
        this.commitMessage(LOG_CODES.metric, message);
    }
}

export default Logger;
