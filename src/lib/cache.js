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
     * @public
     * @param {string} key The cache key
     * @param {*} value The cache value
     * @returns {void}
     */
    set(key, value) {
        this.cache[key] = value;
    }

    /**
     * Caches a simple object in memory cache.
     *
     * @public
     * @param {string} key The cache key
     * @returns {void}
     */
    unset(key) {
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
        return typeof this.cache[key] !== 'undefined';
    }

    /**
     * Fetches a cached object from memory cache.
     *
     * @public
     * @param {string} key the key of the cached object
     * @returns {*} the cached object
     */
    get(key) {
        return this.cache[key];
    }
}

export default new Cache();