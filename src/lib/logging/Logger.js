import * as LogLevel from 'loglevel';

import LoggerCache from './LoggerCache';
import LoggerBackend from './LoggerBackend';
import { registerLogger, unregisterLogger } from './loggerRegistry';
import { LOG_CODES, LOG_LEVELS } from './logConstants';
import { arrayToString, sortLogsByTime, printLog, getISOTime } from './logUtils';
import { APP_HOST } from '../constants';

// Filter for logs allowed to be saved to the logUrl
const DEFAULT_ALLOWED_LOGS = {
    info: true,
    metric: true,
    warning: true,
    error: true,
    uncaught_error: true
};

// Publicliy accessible, doesn't require auth token.
const DEFAULT_LOG_ENDPOINT = '?rm=preview_metrics';

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

    /** @property {LoggerBackend} - Backend object for translating and saving logs. */
    backend;

    /** @property {string} - The name of the logger. Used with the Global Registry */
    name;

    /** @property {Object} - The logs we're allowed to save to the backend. Defaults to all allowed. */
    allowedLogs;

    /**
     * @constructor
     *
     * @param {Object} config - Configures log level and network layer.
     * @param {LOG_LEVELS|string} [config.logLevel] - Level to set for writing to the browser console.
     * @param {string} [config.backendConfig] - Configuration for saving logs to an endpoint. If empty, does
     * not save logs to a URL.
     * @param {Object} [config.allowedLogs] - Flags to allow types of logs to be saved and logged.
     * @return {Logger} Newly created Logger instance.
     */
    constructor(config = {}) {
        this.cache = new LoggerCache();
        this.logger = LogLevel.noConflict();

        // If a log level has not been set and/or persisted, default to silent
        this.logger.setDefaultLevel(DEFAULT_LOG_LEVEL);

        const { logLevel, backendConfig } = config;

        if (logLevel) {
            this.setLogLevel(logLevel);
        }

        this.onUncaughtError = this.onUncaughtError.bind(this);
        window.addEventListener('error', this.onUncaughtError);

        this.name = registerLogger(this);

        if (backendConfig) {
            const sanitizedConfig = this.sanitizeBackendConfig(backendConfig);
            this.backend = new LoggerBackend(sanitizedConfig);
            this.allowedLogs = { ...DEFAULT_ALLOWED_LOGS, ...(config.allowedLogs || {}) };
        }
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

        unregisterLogger(this.name);
        this.name = null;
    }

    /**
     * Sanitizes the configuration for the backend and creates the proper parameters from it.
     *
     * @param {Object} config - Configuration required for configuring the LoggerBackend
     * @return {Object} Sanitized configuration for the LoggerBackend.
     */
    sanitizeBackendConfig(config) {
        let { logUrl } = config;
        const { appHost, logEndpoint, auth } = config;

        if (!logUrl) {
            logUrl = `${appHost || APP_HOST}${logEndpoint || DEFAULT_LOG_ENDPOINT}`;
        }

        if (auth && (!auth.header || !auth.value)) {
            throw new Error('Invalid authorization object provided for saving logs!');
        }

        return {
            logUrl,
            auth
        };
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
        const timestamp = getISOTime();
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
            metricCode: code,
            metricValue: value
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
     * @public
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
     * @public
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

    /**
     * Saves the logs to the backend.
     *
     * @public
     * @param {LOG_CODES|LOG_CODES[]} code - Type of logs to save.
     * @return {void}
     */
    save(code) {
        // If we're not supposed to save, don't attempt it.
        if (!this.backend) {
            return;
        }

        const logs = this.getLogs(code);

        // Filter out disallowed log types
        Object.keys(this.allowedLogs).forEach((logType) => {
            if (!this.allowedLogs[logType]) {
                delete logs[logType];
            }
        });

        const logBatch = [];

        Object.keys(logs).forEach((logType) => {
            // Filter out empty logs
            if (!logs[logType].length) {
                delete logs[logType];
                return;
            }

            const batch = this.backend.createBatch(logType, logs[logType]);
            logBatch.push(batch);
        });

        // save the whole thing
        this.backend.save(logBatch);
    }
}

export default Logger;
