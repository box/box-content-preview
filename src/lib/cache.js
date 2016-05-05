import autobind from 'autobind-decorator';

@autobind
class Cache {

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * [constructor]
     *
     * @returns {Cache} Cache instance
     */
    constructor() {
        this.cache = {};
    }

    /**
     * Caches a simple object in memory and in localStorage if specified.
     * Note that objects cached in localStorage will be stringified.
     *
     * @param {string} key The cache key
     * @param {*} value The cache value
     * @param {Boolean} useLocalStorage Whether or not to use localStorage
     * @returns {void}
     */
    set(key, value, useLocalStorage) {
        this.cache[key] = value;

        if (useLocalStorage && this.localStorageAvailable()) {
            localStorage.setItem(this.generateKey(key), JSON.stringify(value));
        }
    }

    /**
     * Deletes object from in-memory cache and localStorage.
     *
     * @param {string} key The cache key
     * @returns {void}
     */
    unset(key) {
        if (localStorage && typeof localStorage.removeItem === 'function') {
            localStorage.removeItem(this.generateKey(key));
        }

        delete this.cache[key];
    }

    /**
     * Checks if cache has provided key.
     *
     * @param {string} key The cache key
     * @returns {Boolean} Whether the cache has key
     */
    has(key) {
        return this.inCache(key) || this.inLocalStorage(key);
    }

    /**
     * Fetches a cached object from in-memory cache if available. Otherwise
     * tries to fetch from localStorage. If fetched from localStorage, object
     * will be a JSON parsed object.
     *
     * @param {string} key Key of cached object
     * @returns {*} Cached object
     */
    get(key) {
        if (this.inCache(key)) {
            return this.cache[key];
        }

        // If localStorage is available, try to fetch from there and set it
        // in in-memory cache if found
        if (this.inLocalStorage(key)) {
            let value = localStorage.getItem(this.generateKey(key));
            if (value) {
                value = JSON.parse(value);
                this.cache[key] = value;
                return value;
            }
        }

        return undefined;
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Checks if memory cache has provided key.
     *
     * @param {string} key The cache key
     * @returns {Boolean} Whether the cache has key
     */
    inCache(key) {
        return this.cache.hasOwnProperty(key);
    }

    /**
     * Checks if memory cache has provided key.
     *
     * @param {string} key The cache key
     * @returns {Boolean} Whether the cache has key
     */
    inLocalStorage(key) {
        if (localStorage && typeof localStorage.getItem === 'function') {
            const value = localStorage.getItem(this.generateKey(key));
            if (value) {
                return true;
            }
        }
        return false;
    }

    /**
     * Checks whether localStorage is available or not, derived from
     * https://goo.gl/XE10Gu.
     *
     * @returns {Boolean} Whether or not localStorage is available or not.
     * @private
     */
    localStorageAvailable() {
        try {
            const x = '__storage_test__';
            localStorage.setItem(x, x);
            localStorage.removeItem(x);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Generates a key to use for localStorage from the provided key. This
     * should prevent name collisions.
     *
     * @param {String} key Generate key from this key
     * @returns {String} Generated key for localStorage
     * @private
     */
    generateKey(key) {
        return `box-preview-${key}`;
    }
}

export default new Cache();
