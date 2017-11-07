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
     * @param {string} message - The message to store in the cache.
     * @return {void|Error} - Validation throws an error if if fails.
     */
    add(code, message) {
        this.validateLogCode(code);

        if (!this.cache[code]) {
            this.initializeGroup(code);
        }

        this.cache[code].push(message);
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
