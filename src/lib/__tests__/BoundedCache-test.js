/* eslint-disable no-unused-expressions */
import BoundedCache from '../BoundedCache';

const sandbox = sinon.sandbox.create();

describe('BoundedCache', () => {
    let cache;

    beforeEach(() => {
        cache = new BoundedCache(2);
    });

    afterEach(() => {
        sandbox.verifyAndRestore();

        cache = null;
    });

    describe('constructor()', () => {
        it('should initialize properties', () => {
            cache = new BoundedCache();

            expect(cache.maxEntries).to.be.equal(500);
            expect(cache.cache).to.be.empty;
            expect(cache.cacheQueue.length).to.be.equal(0);
        });

        it('should handle maxEntries', () => {
            expect(cache.maxEntries).to.be.equal(2);
        });
    });

    describe('set()', () => {
        it('should add the entry to the cache', () => {
            cache.set('foo', 'bar');

            expect(cache.inCache('foo')).to.be.true;
            expect(cache.cacheQueue).to.be.eql(['foo']);
        });

        it('should not update the cacheQueue if key already exists', () => {
            cache.set('foo', 'bar');
            cache.set('foo', 'bar2');

            expect(cache.inCache('foo')).to.be.true;
            expect(cache.get('foo')).to.be.equal('bar2');
            expect(cache.cacheQueue).to.be.eql(['foo']);
        });

        it('should remove the earliest added entry when entries exceed maxEntries', () => {
            cache.set('foo', 'bar');
            cache.set('hello', 'world');
            cache.set('goodnight', 'moon');

            expect(cache.inCache('foo')).to.be.false;
            expect(cache.cacheQueue).to.be.eql(['hello', 'goodnight']);
        });
    });
});
