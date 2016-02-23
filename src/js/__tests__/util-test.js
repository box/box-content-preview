import { createContentUrl } from '../util';

describe('createContentUrl', () => {
    it('should should return url when no token is provided', () => {
        let url = 'foo';
        assert.equal(url, createContentUrl(url));
    });
});