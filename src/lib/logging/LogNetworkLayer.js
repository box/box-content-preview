import Browser from '../Browser';
import { LOG_TYPES, CLIENT_VERSION } from './logConstants';
import {
    transformMetrics,
    transformWarnings,
    transformInfo,
    transformErrors,
    transformUncaughtErrors
} from './logTransformers';
import { post } from '../util';
import { uuidv4 } from './logUtils';

class LogNetworkLayer {
    /** @property {string} - URL to POST log events to */
    url;

    /** @property {string} - The locale the preview session occurs in. An estimate. */
    locale;

    /** @property {string} - Unique GUID/UUID for identifying session */
    sessionID = uuidv4();

    /**
     * @constructor
     *
     * @param {Object} config - Object used to initialize the network layer.
     * @param {string} config.logURL - The full URL to POST log events to. REQUIRED.
     * @param {string} [config.locale] - Locale string for the session. ie: en-US
     */
    constructor(config = {}) {
        const { logURL, locale } = config;

        this.setURL(logURL);
        this.setLocale(locale);
    }

    /**
     * Set the url to POST logs to.
     *
     * @param {string} url - The url to POST logs to.
     * @return {void}
     */
    setURL(url) {
        this.url = url;
    }

    /**
     * Set local to record logs for.
     *
     * @param {string} locale - The new locale to set.
     * @return {void}
     */
    setLocale(locale) {
        this.locale = locale;
    }

    /**
     * Create a properly formatted batch of logs to be saved to the network layer.
     *
     * @param {LOG_TYPES} type - Type of logs contained in the batch.
     * @param {Object[]} logs - Array of logs to be transformed and batched.
     * @return {Object[]} List of logs transformed to output spec. See logTransformers.js
     */
    createBatch(type, logs) {
        const transform = this.getTransformer(type);

        const info = {
            browser_name: Browser.getName(),
            client_version: CLIENT_VERSION,
            locale: this.locale,
            logger_session_id: this.sessionID
        };

        const batch = transform(logs, info);

        return batch;
    }

    /**
     * Saves all of the logs in the cache, filtered by what is allowed.
     *
     * @param {Object[]} batchList - List of batched logs to save.
     * @return {void}
     */
    save(batchList) {
        if (!batchList.length) {
            return;
        }

        const logsToSave = {
            data: batchList
        };

        post(this.url, {}, logsToSave);
    }

    //--------------------------------------------------------
    // PRIVATE
    //--------------------------------------------------------

    /**
     * Given a type of log, get a transformer that can format the data to suit the network layer recieving it.
     *
     * @param {LOG_TYPES} type - Type of transformer to get.
     * @return {Function} A function that transforms the data to suit storage requirements.
     */
    getTransformer(type) {
        let transformer;

        switch (type) {
            case LOG_TYPES.error:
                transformer = transformErrors;
                break;
            case LOG_TYPES.uncaught_error:
                transformer = transformUncaughtErrors;
                break;
            case LOG_TYPES.metric:
                transformer = transformMetrics;
                break;
            case LOG_TYPES.warning:
                transformer = transformWarnings;
                break;
            case LOG_TYPES.info:
            default:
                transformer = transformInfo;
        }

        return transformer;
    }
}

export default LogNetworkLayer;

/** TOTAL POST REQUEST SHOULD BE:
 * data= [
    {
        // single event
        category: 'preview_log'
        event_type: <error | metric | warning | info>
        logger_session_id: <string> // ID of session 
        timestamp: <string>, // ISO Format
        file_id: <string>,
        file_version_id: <string>,
        content_type: <string>, // Content type of the file previewed
        extension: <string>,
        client_version: <string>, // preview version number
        browser_name: <string>,
        locale: <string>,                        
        event_name: <string>, // Corresponds to the strings defined by us for events
        value: <any> // Must be serializable
    }
]

*/
