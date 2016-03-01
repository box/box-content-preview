import { createContentUrl } from '../util';

describe('util.createContentUrl()', function() {
    it('should should return url when no token is provided', function() {
        let url = 'foo';
        assert.equal(url, createContentUrl(url));
    });
});