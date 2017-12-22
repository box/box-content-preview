import LoggerCache from './LoggerCache';
import LogNetworkLayer from './LogNetworkLayer';
import { registerLogger, unregisterLogger } from './loggerRegistry';
import { LOG_TYPES, CONSOLE_LEVELS } from './logConstants';
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
const DEFAULT_LOG_ENDPOINT = 'index.php?rm=preview_metrics';

// By default, print nothing.
const DEFAULT_CONSOLE_LEVEL = CONSOLE_LEVELS.silent;

/**
 * Logging mechanism that allows for storage of log messages, saving to network layer, and
 * controlling what messages are shown to the user via browser console.
 */
class Logger {
    /** @property {LoggerCache} - Cache for storing and validating log messages */
    cache;

    /** @property {LogNetworkLayer} - Network Layer object for translating and saving logs. */
    networkLayer;

    /** @property {string} - The name of the logger. Used with the Global Registry */
    name;

    /** @property {Object} - The logs we're allowed to save to the networkLayer. Defaults to all allowed. */
    allowedLogs = { ...DEFAULT_ALLOWED_LOGS };

    /** @property {Object} - File info object for current logs. */
    file;

    /** @property {string} - Type of content previewed for current logs. */
    contentType;

    /** @property {CONSOLE_LEVELS} - Level of logging allowed to the console */
    consoleLevel = DEFAULT_CONSOLE_LEVEL;

    /**
     * @constructor
     *
     * @param {Object} config - Configures log level and network layer.
     * @param {CONSOLE_LEVELS|string} [config.consoleLevel] - Level to set for writing to the browser console.
     * @param {boolean} [config.savingEnabled] - If true, allows saving of logs to a networkLayer.
     * @param {string} [config.logURL] - Full url to save logs to. Can instead use appHost with logEndpoint (see below)
     * @param {string} [config.appHost] - Base URL to save logs to. Is combined with logEndpoint (below)
     * @param {string} [config.logEndpoint] - URL Tail to save logs to. Combined with appHost (above)
     * @param {string} [config.locale] - User's locale
     * @return {Logger} Newly created Logger instance.
     */
    constructor(config = {}) {
        this.cache = new LoggerCache();

        const { consoleLevel } = config;
        if (consoleLevel) {
            this.setConsoleLevel(consoleLevel);
        }

        this.onUncaughtError = this.onUncaughtError.bind(this);
        window.addEventListener('error', this.onUncaughtError);

        this.name = registerLogger(this);

        this.setupNetworkLayer(config);
    }

    /**
     * Override previous configuration for the logger network layer.
     *
     * @public
     * @param {Object} config - Configuration object for the network layer
     * @param {boolean} [config.savingEnabled] - If true, allows saving of logs to a network layer.
     * @param {string} [config.logURL] - Full url to save logs to. Can instead use appHost with logEndpoint (see below)
     * @param {string} [config.appHost] - Base URL to save logs to. Is combined with logEndpoint (below)
     * @param {string} [config.logEndpoint] - URL Tail to save logs to. Combined with appHost (above)
     * @param {string} [config.locale] - User's locale
     * @return {void}
     */
    setupNetworkLayer(config = {}) {
        const { savingEnabled } = config;
        if (!savingEnabled) {
            return;
        }

        const { logURL, locale } = this.sanitizeNetworkLayerConfig(config);
        if (!this.networkLayer) {
            this.networkLayer = new LogNetworkLayer();
        }

        if (logURL) {
            this.networkLayer.setURL(logURL);
        }

        if (locale) {
            this.networkLayer.setLocale(locale);
        }
    }

    /**
     * Set the current file info object.
     *
     * @public
     * @param {Object} file - The file with file info to attach to logs.
     * @return {void}
     */
    setFile(file) {
        this.file = file;
    }

    /**
     * Set current content type of file with logs attached.
     *
     * @param {string} type - Content type for the current logs.
     * @return {void}
     */
    setContentType(type) {
        this.contentType = type;
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

        window.removeEventListener('error', this.onUncaughtError);

        unregisterLogger(this.name);
        this.name = null;
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
        this.commitMessage(LOG_TYPES.info, message);
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
        this.commitMessage(LOG_TYPES.warning, message);
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
        this.commitMessage(LOG_TYPES.error, message);
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
        this.commitMessage(LOG_TYPES.metric, {
            eventName,
            value
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
     * @public
     * @param {CONSOLE_LEVELS|string} level - The level of logging to log to console.
     * @return {void}
     */
    setConsoleLevel(level) {
        this.consoleLevel = level;
    }

    /**
     * Get logs from the cache.
     *
     * @public
     * @param {LOG_TYPES|LOG_TYPES[]} [type] - Type of logs to get. If empty, will get all logs.
     * If a list is given, will get each entry specified.
     * @return {Object} The cache entry(ies) requested.
     */
    getLogs(type) {
        const logs = {};

        // eslint-disable-next-line require-jsdoc
        const addGroupToLogs = (msgType) => {
            const logType = LOG_TYPES[msgType];
            logs[logType] = this.cache.getGroup(logType);
        };

        if (!type) {
            Object.keys(LOG_TYPES).forEach(addGroupToLogs);
        } else if (Array.isArray(type)) {
            type.forEach(addGroupToLogs);
        } else {
            addGroupToLogs(type.toLowerCase());
        }

        return logs;
    }

    /**
     * Print logs from the cache, to the console.
     *
     * @public
     * @param {LOG_TYPES|LOG_TYPES[]} [type] - Type of logs to print. If empty, will print all logs.
     * If a list is given, will print each entry specified.
     * @return {void}
     */
    printLogs(type) {
        const logs = this.getLogs(type);
        let logArray = [];

        // Collect all in the appropriate format to sort and print
        Object.keys(logs).forEach((logGroupKey) => {
            logs[logGroupKey].forEach((log) => {
                const { timestamp, message, fileInfo } = log;
                logArray.push({
                    type: logGroupKey,
                    timestamp,
                    message,
                    fileInfo
                });
            });
        });

        // sort by date
        logArray = logArray.sort(sortLogsByTime);

        // print
        logArray.forEach(printLog);
    }

    /**
     * Saves the logs to the network layer.
     *
     * @public
     * @param {LOG_TYPES|LOG_TYPES[]} type - Type of logs to save.
     * @return {void}
     */
    save(type) {
        // If we're not supposed to save, don't attempt it.
        if (!this.networkLayer) {
            return;
        }

        const logs = this.getLogs(type);

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

            const batch = this.networkLayer.createBatch(logType, logs[logType]);
            logBatch.push(batch);
        });

        // save the whole thing
        this.networkLayer.save(logBatch);
    }

    /**
     * Reset file related information.
     *
     * @public
     * @return {void}
     */
    reset() {
        this.setFile(null);
        this.setContentType(null);
    }

    //--------------------------------------------------------
    // PRIVATE
    //--------------------------------------------------------

    /**
     * Sanitizes the configuration for the network layer and creates the proper parameters from it.
     *
     * @private
     * @param {Object} config - Configuration required for configuring the LogNetworkLayer
     * @return {Object} Sanitized configuration for the LogNetworkLayer.
     */
    sanitizeNetworkLayerConfig(config) {
        let { logURL } = config;
        const { appHost, logEndpoint, locale } = config;

        if (!logURL) {
            logURL = `${appHost || APP_HOST}/${logEndpoint || DEFAULT_LOG_ENDPOINT}`;
        }

        return {
            logURL,
            locale
        };
    }

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
     * Handler for uncaught errors. Logs and caches
     *
     * @private
     * @param {Error} error - Error object provided by the error event.
     * @return {void}
     */
    onUncaughtError(error) {
        const message = `${error.message} \n ${error.error.stack}`;
        this.commitMessage(LOG_TYPES.uncaught_error, message);
    }

    /**
     * Commit a message to the cache and run the appropriate log function.
     *
     * @private
     * @param {LOG_TYPES|string} type - The log type this belongs to.
     * @param {*} message - The message to log.
     * @return {void}
     */
    commitMessage(type, message) {
        const logFunction = this.canPrintLog(type) ? this.getLoggerFunction(type) : null;

        // Format message and add a timestamp
        const timestamp = getISOTime();
        this.cache.add(
            type,
            timestamp,
            {
                contentType: this.contentType,
                file: { ...this.file }
            },
            message
        );

        // Also wrapping the type into the message
        // #TODO(@jholdstock): abstract this step
        if (logFunction) {
            const formattedMessage = `${timestamp} "${message}"`;
            logFunction(`[${type}] ${formattedMessage}`);
        }
    }
}

export default Logger;
