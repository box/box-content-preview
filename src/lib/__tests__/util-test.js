import { createContentUrl, createScript, createAssetUrlCreator } from '../util';

describe('util', () => {
    describe('createContentUrl()', () => {
        it('should return url when no token is provided', () => {
            const url = 'foo';
            assert.equal(url, createContentUrl(url));
        });
    });

    describe('createScript()', () => {
        it('should return a script element when a url is provided', () => {
            const url = 'foo';
            const scriptEl = createScript(url);
            assert.ok(scriptEl instanceof HTMLElement);
            assert.equal(scriptEl.tagName, 'SCRIPT');
            assert.equal(scriptEl.src.indexOf(url), scriptEl.src.length - url.length);
        });
    });

    describe('createAssetUrlCreator()', () => {
        it('should return a function to create asset urls', () => {
            const location = {
                baseURI: 'base/',
                staticBaseURI: 'static/'
            };
            const assetUrlCreator = createAssetUrlCreator(location);
            assert.equal(typeof assetUrlCreator, 'function');
            assert.equal(assetUrlCreator('somename'), 'base/somename');
            assert.equal(assetUrlCreator('http://somename'), 'http://somename');
            assert.equal(assetUrlCreator('third-party/somename'), 'static/third-party/somename');
        });
    });
});
