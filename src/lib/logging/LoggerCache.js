import { LOG_TYPES } from './logConstants';

/**
 * Caching mechanism for for logging messages.
 */
class LoggerCache {
    /** @property {Object} - Cache for storing log messages */
    cache;

    /**
     * @constructor
     */
    constructor() {
        this.cache = {};
    }

    /**
     * Clears and removes the cache.
     *
     * @public
     * @return {void}
     */
    destroy() {
        this.clear();
        this.cache = null;
    }

    /**
     * Add a message to the cache after validating it.
     *
     * @public
     * @param {LOG_TYPES|string} type - Type of message to add to the cache.
     * @param {string} timestamp - A timestamp of when the log occurred.
     * @param {string} fileInfo - The file info associated with the log.
     * @param {string|Object} message - The message to store in the cache.
     * @return {void|Error} - Validation throws an error if if fails.
     */
    add(type, timestamp, fileInfo, message) {
        this.validateLogType(type);

        if (!this.cache[type]) {
            this.initializeGroup(type);
        }

        this.cache[type].push({
            timestamp,
            fileInfo,
            message
        });
    }

    /**
     * Get a group of logs from the cache.
     *
     * @param {LOG_TYPES|string} type - Group name to get from the cache.
     * @return {Array} The group from the cache, if available, otherwise an empty array.
     */
    getGroup(type) {
        if (!this.cache || !this.cache[type]) {
            return [];
        }

        return this.cache[type];
    }

    /**
     * Purges a group from the cache.
     *
     * @public
     * @param {LOG_TYPES|string} type - Group type to purge from the cache.
     * @return {void}
     */
    clearGroup(type) {
        if (!this.cache || !this.cache[type]) {
            return;
        }

        this.cache[type].length = 0;
    }

    /**
     * Purges the entire cache.
     *
     * @public
     * @return {void}
     */
    clear() {
        if (!this.cache) {
            return;
        }

        Object.keys(this.cache).forEach((type) => {
            this.clearGroup(type);
        });
    }

    //--------------------------------------------------------
    // PRIVATE
    //--------------------------------------------------------

    /**
     * Initialize a group in the cache based off of the type provided, if it doesn't exist.
     *
     * @private
     * @param {LOG_TYPES|string} type - One of the possible types that exists in the logging cache.
     * @return {void}
     */
    initializeGroup(type) {
        this.cache[type] = this.cache[type] || [];
    }

    /**
     * Validates the cache group type.
     *
     * @private
     * @param {LOG_TYPES|string} type - The type to validate.
     * @return {void|Error} - Throws an error if an invalid type.
     */
    validateLogType(type) {
        const isValid = Object.keys(LOG_TYPES).some((logType) => logType !== type);

        if (!isValid) {
            throw new Error(`Invalid Message Type: ${type}`);
        }
    }
}

export default LoggerCache;
