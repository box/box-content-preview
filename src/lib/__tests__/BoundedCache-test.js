/* eslint-disable no-unused-expressions */
import BoundedCache from '../BoundedCache';

describe('BoundedCache', () => {
    let cache;

    beforeEach(() => {
        cache = new BoundedCache(2);
    });

    afterEach(() => {
        cache = null;
    });

    describe('constructor()', () => {
        test('should initialize properties', () => {
            cache = new BoundedCache();

            expect(cache.maxEntries).toBe(500);
            expect(cache.cache).toEqual({});
            expect(cache.cacheQueue.length).toBe(0);
        });

        test('should handle maxEntries', () => {
            expect(cache.maxEntries).toBe(2);
        });
    });

    describe('set()', () => {
        test('should add the entry to the cache', () => {
            cache.set('foo', 'bar');

            expect(cache.inCache('foo')).toBe(true);
            expect(cache.cacheQueue).toEqual(['foo']);
        });

        test('should not update the cacheQueue if key already exists', () => {
            cache.set('foo', 'bar');
            cache.set('foo', 'bar2');

            expect(cache.inCache('foo')).toBe(true);
            expect(cache.get('foo')).toBe('bar2');
            expect(cache.cacheQueue).toEqual(['foo']);
        });

        test('should remove the earliest added entry when entries exceed maxEntries', () => {
            cache.set('foo', 'bar');
            cache.set('hello', 'world');
            cache.set('goodnight', 'moon');

            expect(cache.inCache('foo')).toBe(false);
            expect(cache.cacheQueue).toEqual(['hello', 'goodnight']);
        });
    });
});
