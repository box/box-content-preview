import Browser from '../Browser';
import { LOG_CODES, CLIENT_VERSION } from './logConstants';
import { transformMetrics, transformWarnings, transformInfo, transformErrors } from './logTransformers';
import { post } from '../util';
import { uuidv4 } from './logUtils';

class LoggerBackend {
    /** @property {string} - URL to POST log events to */
    logURL;

    /** @property {Object} - Auth token to set as a Header on each log request */
    auth;

    /** @property {string} - The locale the preview session occurs in. An estimate. */
    locale;

    /** @property {string} - Unique GUID/UUID for identifying session */
    sessionID = uuidv4();

    /**
     * @param {Object} config - Object used to initialize the backend.
     * @param {string} config.logURL - The full URL to POST log events to. REQUIRED.
     * @param {string} [config.auth] - If provided, sends as a header named <header>, with value: <value>
     */
    constructor(config = {}) {
        const { logURL, locale, auth } = config;

        this.logURL = logURL;
        this.locale = locale;

        if (auth) {
            this.auth = auth;
        }
    }

    /**
     * Given a type of log, get a transformer that can format the data to suit the backend recieving it.
     *
     * @param {LOG_CODES} type - Type of transformer to get.
     * @return {Function} A function that transforms the data to suit storage requirements.
     */
    getTransformer(type) {
        let transformer;

        switch (type) {
            case LOG_CODES.error:
            case LOG_CODES.uncaught_error:
                transformer = transformErrors;
                break;
            case LOG_CODES.metric:
                transformer = transformMetrics;
                break;
            case LOG_CODES.warning:
                transformer = transformWarnings;
                break;
            case LOG_CODES.info:
            default:
                transformer = transformInfo;
        }

        return transformer;
    }

    /**
     * Create a properly formatted batch of logs to be saved to the backend.
     *
     * @param {LOG_CODES} type - Type of logs contained in the batch.
     * @param {Object} logs - Object containing type and array of logs that belong to it.
     * @return {Object} Formatted object to be saved to the backend.
     */
    createBatch(type, logs) {
        const transform = this.getTransformer(type);
        const batch = transform(logs);

        return batch;
    }

    /**
     * Saves all of the logs in the cache, filtered by what is allowed.
     *
     * @param {Object[]} batchList - List of batched logs to save.
     * @return {void}
     */
    save(batchList) {
        const info = {
            browser_name: Browser.getName(),
            client_version: CLIENT_VERSION,
            locale: this.locale,
            session_id: this.sessionID
        };

        const logsToSave = {
            info,
            events: batchList
        };

        post(this.logURL, {}, logsToSave);
    }
}

export default LoggerBackend;

/**
 *
 * event_type: <ERROR | METRIC | WARNING | INFO>
 * timestamp: <string>, // ISO Format
 * client_version: <string>, // preview version number
 * browser_name: <string>,
 * country_code: <string>,
 *
 * file_id: <string>,
 * file_version_id: <string>,
 * code: <string>, // Corresponds to the strings defined by us for events
 * value: <any> // Must be serializable
 */

/** TOTAL POST REQUEST SHOULD BE:
  *  Remember, for event_type METRIC and CODE: METRIC_CONTROLS,
  *  the value is the whole list of Interactions with controls

    {
        info: {
            client_version,
            browser_name,
            country_code,
            session_id
        },
        events: [
            {
                event_type: <ERROR | METRIC | WARNING | INFO>,
                events: [
                    {
                        file_id,
                        file_version_id,
                        timestamp,
                        code,
                        value
                    }
                ]
            }
        ]
    }
  */

/** preview_metric endpoint, in Box, will translate to the following:
    [
        {
            event_type,
            timestamp,
            file_id,
            file_version,
            client_version,
            browser_name,
            locale,
            code,
            value
        }
    ]
*/
