import { LOG_CODES } from './logConstants';

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
     * Initialize a group in the cache based off of the code provided, if it doesn't exist.
     *
     * @private
     * @param {LOG_CODES|string} code - One of the possible codes that exists in the logging cache.
     * @return {void}
     */
    initializeGroup(code) {
        this.cache[code] = this.cache[code] || [];
    }

    /**
     * Validates the cache group type.
     *
     * @private
     * @param {LOG_CODES|string} code - The code to validate.
     * @return {void|Error} - Throws an error if an invalid code.
     */
    validateLogCode(code) {
        const isValid = Object.keys(LOG_CODES).some((logCode) => logCode !== code);

        if (!isValid) {
            throw new Error(`Invalid Message Code: ${code}`);
        }
    }

    /**
     * Add a message to the cache after validating it.
     *
     * @public
     * @param {LOG_CODES|string} code - Type of message to add to the cache.
     * @param {string} timestamp - A timestamp of when the log occurred.
     * @param {string|Object} message - The message to store in the cache.
     * @return {void|Error} - Validation throws an error if if fails.
     */
    add(code, timestamp, message) {
        this.validateLogCode(code);

        if (!this.cache[code]) {
            this.initializeGroup(code);
        }

        this.cache[code].push({
            timestamp,
            message
        });
    }

    /**
     * Get a group of logs from the cache.
     *
     * @param {LOG_CODES|string} code - Group name to get from the cache.
     * @return {Array} The group from the cache, if available, otherwise an empty array.
     */
    getGroup(code) {
        if (!this.cache || !this.cache[code]) {
            return [];
        }

        return this.cache[code];
    }

    /**
     * Purges a group from the cache.
     *
     * @public
     * @param {LOG_CODES|string} code - Group name to purge from the cache.
     * @return {void}
     */
    clearGroup(code) {
        if (!this.cache || !this.cache[code]) {
            return;
        }

        this.cache[code].length = 0;
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

        Object.keys(this.cache).forEach((code) => {
            this.clearGroup(code);
        });
    }
}

export default LoggerCache;
