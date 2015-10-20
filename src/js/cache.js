'use strict';

import 'core-js/modules/es6.reflect';
import autobind from 'autobind-decorator';

@autobind
class Cache {

    /**
     * [constructor]
     * @returns {Cache}
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