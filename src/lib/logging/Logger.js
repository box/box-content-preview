import * as LogLevel from 'loglevel';

import LoggerCache from './LoggerCache';
import LoggerNetwork from './LoggerNetwork';
import { LOG_CODES, LOG_LEVELS } from './logConstants';
import { arrayToString, sortLogsByTime, printLog } from './logUtils';

// By default, print nothing.
const DEFAULT_LOG_LEVEL = LOG_LEVELS.silent;

/**
 * Logging mechanism that allows for storage of log messages, saving to backend, and
 * controlling what messages are shown to the user via browser console.
 */
class Logger {
    /** @property {Object} - Instance of internal logger */
    logger;

    /** @property {LoggerCache} - Cache for storing and validating log messages */
    cache;

    /** */
    networkLayer;

    /**
     * @constructor
     *
     * @param {Object} config - Configures log level and network layer.
     * @param {LOG_LEVELS|string} [config.logLevel] - Level to set for writing to the browser console.
     * @param {string} [config.logEndpoint] - The URL to POST logs to.
     * @return {Logger} Newly created Logger instance.
     */
    constructor(config = {}) {
        this.cache = new LoggerCache();
        this.logger = LogLevel.noConflict();

        // If a log level has not been set and/or persisted, default to silent
        this.logger.setDefaultLevel(DEFAULT_LOG_LEVEL);

        const { logLevel, logEndpoint } = config;

        if (logLevel) {
            this.setLogLevel(logLevel);
        }

        if (logEndpoint) {
            this.networkLayer = new LoggerNetwork();
        }

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
            case LOG_CODES.uncaught_error:
                logFunction = this.logger.error;
                break;
            case LOG_CODES.info:
                logFunction = this.logger.info;
                break;
            default:
                logFunction = null;
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
        const message = `${error.message} \n ${error.error.stack}`;
        this.commitMessage(LOG_CODES.uncaught_error, message);
    }

    /**
     * Commit a message to the cache and run the appropriate log function.
     *
     * @private
     * @param {LOG_CODES|string} code - The log code this belongs to.
     * @param {*} message - The message to log.
     * @return {void}
     */
    commitMessage(code, message) {
        const logFunction = this.getLoggerFunction(code);

        // Format message and add a timestamp
        const timestamp = new Date().toISOString();
        this.cache.add(code, timestamp, message);

        // Also wrapping the code into the message
        // #TODO(@jholdstock): abstract this step
        if (logFunction) {
            const formattedMessage = `${timestamp} "${message}"`;
            logFunction(`[${code}] ${formattedMessage}`);
        }
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
     * @param {number} code - Code associated with a specific metric.
     * @param {*} value -
     * @return {void}
     */
    metric(code, value) {
        this.commitMessage(LOG_CODES.metric, {
            metric_code: code,
            metric_value: value
        });
    }

    /**
     * Clear out the cache.
     *
     * @public
     * @return {void}
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Sets the current level of messages to be logged to the console.
     *
     * @param {LOG_LEVELS|string} level - The level of logging to log to console.
     * @param {boolean} [persist] - Whether or not to persist across sessions.
     * @return {void}
     */
    setLogLevel(level, persist = false) {
        this.logger.setLevel(level, persist);
    }

    /**
     * Get logs from the cache.
     *
     * @param {LOG_CODES|LOG_CODES[]} [code] - Type of logs to get. If empty, will get all logs.
     * If a list is given, will get each entry specified.
     * @return {Object} The cache entry(ies) requested.
     */
    getLogs(code) {
        const logs = {};

        // eslint-disable-next-line require-jsdoc
        const addGroupToLogs = (msgCode) => {
            const logCode = LOG_CODES[msgCode];
            logs[logCode] = this.cache.getGroup(logCode);
        };

        if (!code) {
            Object.keys(LOG_CODES).forEach(addGroupToLogs);
        } else if (Array.isArray(code)) {
            code.forEach(addGroupToLogs);
        } else {
            addGroupToLogs(code.toLowerCase());
        }

        return logs;
    }

    /**
     * Print logs from the cache, to the console.
     *
     * @param {LOG_CODES|LOG_CODES[]} [code] - Type of logs to print. If empty, will print all logs.
     * If a list is given, will print each entry specified.
     * @return {void}
     */
    printLogs(code) {
        const logs = this.getLogs(code);
        let logArray = [];

        // Collect all in the appropriate format to sort and print
        Object.keys(logs).forEach((logGroupKey) => {
            logs[logGroupKey].forEach((log) => {
                const { timestamp, message } = log;
                logArray.push({
                    type: logGroupKey,
                    timestamp,
                    message
                });
            });
        });

        // sort by date
        logArray = logArray.sort(sortLogsByTime);

        // print
        logArray.forEach(printLog);
    }
}

export default Logger;
