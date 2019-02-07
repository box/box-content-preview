import Cache from './Cache';

class BoundedCache extends Cache {
    cacheQueue;

    maxEntries;

    constructor(maxEntries) {
        super();

        this.maxEntries = maxEntries || 500;
        this.cache = {};
        this.cacheQueue = [];
    }

    destroy() {
        this.cache = null;
        this.cacheQueue = null;
    }

    set(key, value) {
        // If this key is not already in the cache, then add it
        // to the cacheQueue. This avoids adding the same key to
        // the cacheQueue multiple times if the cache entry gets updated
        if (!this.inCache(key)) {
            this.cacheQueue.push(key);
        }

        super.set(key, value);

        // If the cacheQueue exceeds the maxEntries then remove the first
        // key from the front of the cacheQueue and unset that entry
        // from the cache
        if (this.cacheQueue.length > this.maxEntries) {
            const deleteKey = this.cacheQueue.shift();
            this.unset(deleteKey);
        }
    }
}

export default BoundedCache;
