class Cache {
    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * [constructor]
     *
     * @return {Cache} Cache instance
     */
    constructor() {
        this.cache = {};
    }

    /**
     * Caches a simple object in memory and in localStorage if specified.
     * Note that objects cached in localStorage will be stringified.
     *
     * @param {string} key - The cache key
     * @param {*} value - The cache value
     * @param {boolean} useLocalStorage - Whether or not to use localStorage
     * @return {void}
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
     * @param {string} key - The cache key
     * @return {void}
     */
    unset(key) {
        if (this.localStorageAvailable()) {
            localStorage.removeItem(this.generateKey(key));
        }

        delete this.cache[key];
    }

    /**
     * Checks if cache has provided key.
     *
     * @param {string} key - The cache key
     * @return {boolean} Whether the cache has key
     */
    has(key) {
        return this.inCache(key) || this.inLocalStorage(key);
    }

    /**
     * Fetches a cached object from in-memory cache if available. Otherwise
     * tries to fetch from localStorage. If fetched from localStorage, object
     * will be a JSON parsed object.
     *
     * @param {string} key - Key of cached object
     * @return {*} Cached object
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
     * @param {string} key - The cache key
     * @return {boolean} Whether the cache has key
     */
    inCache(key) {
        return {}.hasOwnProperty.call(this.cache, key);
    }

    /**
     * Checks if memory cache has provided key.
     *
     * @param {string} key - The cache key
     * @return {boolean} Whether the cache has key
     */
    inLocalStorage(key) {
        if (!this.localStorageAvailable()) {
            return false;
        }

        return !!localStorage.getItem(this.generateKey(key));
    }

    /**
     * Checks whether localStorage is available or not, derived from
     * https://goo.gl/XE10Gu.
     *
     * @NOTE(tjin): This check is cached to not have to write/read from disk
     * every time this check is needed, but this will not catch instances where
     * localStorage was available the first time this is called, but becomes
     * unavailable at a later time.
     *
     * @return {boolean} Whether or not localStorage is available or not.
     * @private
     */
    localStorageAvailable() {
        if (this.available === undefined) {
            try {
                const x = '__storage_test__';
                localStorage.setItem(x, x);
                localStorage.removeItem(x);
                this.available = true;
            } catch (e) {
                this.available = false;
            }
        }

        return this.available;
    }

    /**
     * Generates a key to use for localStorage from the provided key. This
     * should prevent name collisions.
     *
     * @param {string} key - Generate key from this key
     * @return {string} Generated key for localStorage
     * @private
     */
    generateKey(key) {
        return `bp-${key}`;
    }
}

export default Cache;
