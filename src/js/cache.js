'use strict';

import autobind from 'autobind-decorator';

@autobind
class Cache {

    /**
     * [constructor]
     * @returns {Cache} Cache instance
     */
    constructor() {
        this.cache = {};
    }

    /**
     * Caches a simple object in memory cache.
     *
     * @param {string} key The cache key
     * @param {*} value The cache value
     * @public
     * @returns {void}
     */
    set(key, value) {
        this.cache[key] = value;
    }

    /**
     * Caches a simple object in memory cache.
     *
     * @param {string} key The cache key
     * @public
     * @returns {Boolean} whether the cache has key
     */
    has(key) {
        return !!this.cache[key];
    }

    /**
     * Fetches a cached object from memory cache.
     *
     * @param {string} key the key of the cached object
     * @public
     * @returns {*} the cached object
     */
    get(key) {
        return this.cache[key];
    }
}

export default new Cache();