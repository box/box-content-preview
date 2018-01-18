import LoggerCache from './LoggerCache';
import LogNetworkLayer from './LogNetworkLayer';
import { LOG_TYPES } from './logConstants';
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

const DEFAULT_LOG_ENDPOINT = 'index.php?rm=box_gen204_json_record';

/**
 * Logging mechanism that allows for storage of log messages and saving to network layer.
 */
class Logger {
    /** @property {LoggerCache} - Cache for storing and validating log messages */
    cache;

    /** @property {LogNetworkLayer} - Network Layer object for translating and saving logs. */
    networkLayer;

    /** @property {Object} - The logs we're allowed to save to the networkLayer. Defaults to all allowed. */
    allowedLogs = { ...DEFAULT_ALLOWED_LOGS };

    /** @property {Object} - File info object for current logs. */
    file;

    /** @property {string} - Type of content previewed for current logs. */
    contentType;

    /**
     * @constructor
     *
     * @param {Object} config - Configures log level and network layer.
     * @param {boolean} [config.savingEnabled] - If true, allows saving of logs to a networkLayer.
     * @param {string} [config.logURL] - Full url to save logs to. Can instead use appHost with logEndpoint (see below)
     * @param {string} [config.appHost] - Base URL to save logs to. Is combined with logEndpoint (below)
     * @param {string} [config.logEndpoint] - URL Tail to save logs to. Combined with appHost (above)
     * @param {string} [config.locale] - User's locale
     * @return {Logger} Newly created Logger instance.
     */
    constructor(config = {}) {
        this.cache = new LoggerCache();

        this.onUncaughtError = this.onUncaughtError.bind(this);
        window.addEventListener('error', this.onUncaughtError);

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
     * Get logs from the cache.
     *
     * @public
     * @param {LOG_TYPES|LOG_TYPES[]} [type] - Type of logs to get. If null/undefined, will get all logs.
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
            logBatch.push(...batch);
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
    }
}

export default Logger;
