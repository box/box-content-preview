import autobind from 'autobind-decorator';

@autobind
class Cache {

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * [constructor]
     * @returns {Cache} Cache instance
     */
    constructor() {
        this.cache = {};
    }

    /**
     * Caches a simple object in memory or in localStorage. Note that objects
     * cached in localStorage will be stringified.
     *
     * @public
     * @param {string} key The cache key
     * @param {*} value The cache value
     * @param {Boolean} useLocalStorage Whether or not to use localStorage
     * @returns {void}
     */
    set(key, value, useLocalStorage) {
        if (useLocalStorage && this._localStorageAvailable()) {
            window.localStorage.setItem(key, JSON.stringify(value));
        } else {
            this.cache[key] = value;
        }
    }

    /**
     * Deletes object from in-memory cache and localStorage.
     *
     * @public
     * @param {string} key The cache key
     * @returns {void}
     */
    unset(key) {
        if (this._localStorageAvailable()) {
            window.localStorage.removeItem(key);
        }

        delete this.cache[key];
    }

    /**
     * Caches a simple object in memory cache.
     *
     * @public
     * @param {string} key The cache key
     * @returns {Boolean} whether the cache has key
     */
    has(key) {
        const inLocalStorage = this._localStorageAvailable() && window.localStorage.getItem(key);
        const inMemory = typeof this.cache[key] !== 'undefined';

        return inLocalStorage || inMemory;
    }

    /**
     * Fetches a cached object from localStorage or in-memory cache. If object
     * is fetched from localStorage, it will be JSON.parsed.
     *
     * @public
     * @param {string} key the key of the cached object
     * @returns {*} the cached object
     */
    get(key) {
        if (this._localStorageAvailable()) {
            const cached = window.localStorage.getItem(key);
            if (cached) {
                return JSON.parse(cached);
            }
        }

        return this.cache[key];
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Checks whether localStorage is available or not.
     *
     * @returns {Boolean} Whether or not localStorage is available or not.
     * @private
     */
    _localStorageAvailable() {
        if (typeof this._localStorageAvailable !== undefined) {
            return this._localStorageAvailable;
        }

        // Need to feature detect for localStorage, see https://goo.gl/XE10Gu
        try {
            const storage = window.localStorage;
            const x = '__storage_test__';
            storage.setItem(x, x);
            storage.removeItem(x);
            this._localStorageAvailable = true;
        } catch (e) {
            this._localStorageAvailable = false;
        }

        return this._localStorageAvailable;
    }
}

export default new Cache();
