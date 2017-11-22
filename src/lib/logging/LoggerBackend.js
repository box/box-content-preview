import { LOG_CODES, LOG_LEVELS } from './logConstants';

class LoggerBackend {
    /** @property {string} - URL to POST log events to */
    logUrl;

    /** @property {Object} - Auth token to set as a Header on each log request */
    auth;

    /**
     * @param {Object} config - Object used to initialize the backend.
     * @param {string} config.logURL - The full URL to POST log events to. REQUIRED.
     * @param {string} [config.auth] - If provided, sends as a header named <header>, with value: <value>
     */
    constructor(config = {}) {
        this.logURL = config.logURL;

        if (config.auth) {
            this.auth = config.auth;
        }
    }

    /**
     * Create a properly formatted batch of logs to be saved to the backend.
     *
     * @param {Object} logs - Object containing type and array of logs that belong to it.
     * @return {Object} Formatted object to be saved to the backend.
     */
    createBatch(logs) {}

    /**
     * Saves all of the logs in the cache, filtered by what is allowed.
     *
     * @param {Object[]} batchList - List of batched logs to save.
     * @return {void}
     */
    save(batchList) {
        console.log(batchList);
    }
}

export default LoggerBackend;

/**
 *
 * event_type: <ERROR | METRIC | WARNING | INFO>
 * timestamp: <string>, // ISO Format
 * file_id: <string>,
 * client_version: <string>, // preview version number
 * browser_name: <string>,
 * country_code: <string>,
 * code: <string>, // Corresponds to the strings defined by us for events
 * value: <any> // Must be serializable
 */
