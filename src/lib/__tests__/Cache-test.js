import 'mock-local-storage';
import Cache from '../Cache';

const sandbox = sinon.sandbox.create();
let cache;

describe('Cache', () => {
    beforeEach(() => {
        cache = new Cache();
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        localStorage.clear();
    });

    it('should set and get correctly', () => {
        const getSpy = sandbox.spy(localStorage, 'getItem');
        const setSpy = sandbox.spy(localStorage, 'setItem');

        cache.set('foo', 'bar', true);
        assert.ok(cache.has('foo'));
        assert.equal(cache.get('foo'), 'bar');

        // Nuke from in-mem cache
        delete cache.cache.foo;

        assert.ok(cache.has('foo'));
        assert.equal(cache.get('foo'), 'bar');

        /* eslint-disable no-unused-expressions */
        expect(getSpy).to.be.calledWith('bp-foo');
        expect(setSpy).to.be.calledWith('bp-foo', JSON.stringify('bar'));
        /* eslint-enable no-unused-expressions */

        cache.unset('foo');
        assert.notOk(cache.has('foo'));
    });

    it('should set and get correctly with 0 value', () => {
        cache.set('foo', 0, true);
        assert.ok(cache.has('foo'));
        assert.equal(cache.get('foo'), 0);
    });

    it('should return undefined when not set', () => {
        assert.equal(cache.get('foobar'), undefined);
    });
});
