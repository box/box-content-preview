'use strict';

import 'core-js/modules/es6.reflect';
import autobind from 'autobind-decorator';

let singleton = null; 

@autobind
class Cache {

    /**
     * [constructor]
     * @returns {Cache}
     */
    constructor() {
        if (!singleton) {
            this.cache = {};
            singleton = this;
        }

        return singleton;
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