import * as LogLevel from 'loglevel';

import LoggerCache from './LoggerCache';
import { LOG_CODES } from './logConstants';
import { arrayToString } from './logUtils';

const CONSOLE_COLORS = {
    [LOG_CODES.error]: '#C70039',
    [LOG_CODES.warning]: '#FFBE33',
    [LOG_CODES.info]: '#33BEFF',
    none: '#FFF'
};

/**
 * Logging mechanism that allows for storage of log messages, saving to backend, and 
 * controlling what messages are shown to the user via browser console.
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
        this.error(error.message, '\n', error.error.stack);
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
     * Get logs from the cache.
     * 
     * @param {LOG_CODES|LOG_CODES[]} [code] - Type of logs to get. If empty, will get all logs.
     * If a list is given, will get each entry specified.
     * @return {Object} The cache entry(ies) requested.
     */
    getLogs(code) {
        const logs = {};

        if (!code) {
            Object.keys(LOG_CODES).forEach((msgCode) => {
                const logCode = LOG_CODES[msgCode];
                logs[logCode] = this.cache.getGroup(logCode);
            });
        } else if (Array.isArray(code)) {
            code.forEach((msgCode) => {
                const logCode = LOG_CODES[msgCode];
                logs[logCode] = this.cache.getGroup(logCode);
            });
        } else {
            const logCode = LOG_CODES[code];
            logs[logCode] = this.cache.getGroup(logCode);
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
        logArray = logArray.sort((prev, next) => {
            return Date.parse(prev.timestamp) > Date.parse(next.timestamp);
        });

        // collect for printing to console

        // print
        logArray.forEach((log) => {
            const color = CONSOLE_COLORS[log.type] || CONSOLE_COLORS.none;
            const output = `${log.timestamp} "${log.message}"`;
            // eslint-disable-next-line no-console
            console.log(`%c [${log.type}] `, `color: ${color}`, output);
        });
    }
}

export default Logger;

/**
    data:[  
    {  
       "event_type":"preview",
       "category":"ERROR",
       "events":[  ]
    },
    {
       "event_type":"preview",
       "category":"WARNING",
       "events":[  ]
    },
    {  
       "event_type":"preview",
       "category":"INFO",
       "events":[  ]
    },
    {  
       "event_type":"preview",
       "category":"METRIC",
       "events":[  ]
    }
 */

/** 
    // Each event is as follows

    {
        "file_id": <file_id>,
        "client_version": <client_version>,
        "timestamp": <timestamp>,
        "message": <message_string>
        //
        //  Message Examples
        //
        "Uncaught error" // ERROR
        "User did something unexpected" // INFO
        "User doesn't support webgl" // WARNING
    }

    // METRIC messages follow a slightly different format
    // Given timestamp, file_id, and metric codes, we should be able to roughly
    // recreate how a user interacts with the document
    {
        "file_id": <file_id>,
        "client_version": <client_version>,
        "timestamp": <timestamp>
        "metric_code": <metric_code> // A code will correspond to an action.
        "metric_value": <value> // A value that relates to the metric.
        //
        //  Metric examples. Not concrete, just examples.
        //  

        // Time spent in preview
        metric_code: 1,
        metric_value: 1238978

        // Abandoned preview. Doesn't matter what the value is, bc this'll
        // only be triggered on navigate before preview
        metric_code: 2,
        metric_value: true
        
        // Controls interaction. Timestamp will be when it saves, and 
        // value stamps will be interaction steps
        metric_code: 9
        metric_value: [ // each control will have it's own code
            {
                timestamp: 1000,
                code: 1 // zoom in
            },
            {
                timestamp: 1010,
                code: 2 // zoom out
            },
            {
                timestamp: 1050,
                code: 6 // interact with page controls
            }
        ]
        // Note, the array for controls will be aggregated when submitting to 
        // gen204, in the network translation layer (I think I want one)

        // Scrubbing audio
        metric_code: 10 // different than scrubbing video
        metric_value: 5000// time (ms) since last scrub OR start of preview

    }
*/
