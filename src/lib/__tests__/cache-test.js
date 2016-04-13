import cache from '../cache';

describe('Cache', () => {
    it('should set and get correctly', () => {
        cache.set('foo', 'bar');
        assert.ok(cache.has('foo'));
        assert.equal(cache.get('foo'), 'bar');
        cache.unset('foo');
        assert.notOk(cache.has('foo'));
    });
});
