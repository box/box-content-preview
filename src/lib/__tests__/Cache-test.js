import Cache from '../Cache';

describe('Cache', () => {
    let cache;

    beforeEach(() => {
        cache = new Cache();
    });

    afterEach(() => {
        localStorage.clear();
    });

    test('should set and get correctly', () => {
        jest.spyOn(cache, 'isLocalStorageAvailable').mockReturnValue(true);

        cache.set('foo', 'bar', true);
        expect(cache.has('foo')).toBeTruthy();
        expect(cache.get('foo')).toEqual('bar');

        // Nuke from in-mem cache
        delete cache.cache.foo;

        expect(cache.has('foo')).toBeTruthy();
        expect(cache.get('foo')).toEqual('bar');
        expect(JSON.parse(localStorage.getItem('bp-foo'))).toBe('bar');

        cache.unset('foo');
        expect(cache.has('foo')).toBeFalsy();
        expect(JSON.parse(localStorage.getItem('bp-foo'))).toBeNull();
    });

    test('should set and get correctly with 0 value', () => {
        cache.set('foo', 0, true);
        expect(cache.has('foo')).toBeTruthy();
        expect(cache.get('foo')).toEqual(0);
    });

    test('should return undefined when not set', () => {
        expect(cache.get('foobar')).toEqual(undefined);
    });
});
