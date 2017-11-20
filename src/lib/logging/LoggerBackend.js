import { LOG_CODES } from './logConstants';

// Filter for logs allowed to be saved to the logUrl
const DEFAULT_ALLOWED_LOGS = {
    info: true,
    metric: true,
    warning: true,
    error: true,
    uncaught_error: true
};

class LoggerBackend {
    /** @property {string} - URL to POST log events to */
    logUrl;

    /** @property {Object} - Auth token to set as a Header on each log request */
    auth;

    /**
     *
     * @param {LoggerCache} cache - Logger cache reference.
     * @param {Object} config - Object used to initialize the backend.
     * @param {string} config.logURL - The full URL to POST log events to. REQUIRED.
     * @param {string} [config.auth] - If provided, sends as a header named <header>, with value: <value>
     * @param {Object} [config.allowedLogs] - Flags to allow types of logs to be saved.
     */
    constructor(cache, config = {}) {
        this.logURL = config.logURL;

        if (config.auth) {
            this.auth = config.auth;
        }

        this.allowedLogs = { ...DEFAULT_ALLOWED_LOGS, ...(config.allowedLogs || {}) };
    }

    /**
     * Saves all of the logs in the cache, filtered by what is allowed.
     *
     * @return {void}
     */
    save() {}
}

export default LoggerBackend;
