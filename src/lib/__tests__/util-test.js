import { createContentUrl, createScript, createAssetUrlCreator } from '../util';

describe('util', function() {

    describe('createContentUrl()', function() {
        it('should return url when no token is provided', function() {
            const url = 'foo';
            assert.equal(url, createContentUrl(url));
        });
    });

    describe('createScript()', function() {
        it('should return a script element when a url is provided', function() {
            const url = 'foo';
            const scriptEl = createScript(url);
            assert.ok(scriptEl instanceof HTMLElement);
            assert.equal(scriptEl.tagName, 'SCRIPT');
            assert.equal(scriptEl.src.indexOf(url), scriptEl.src.length - url.length);
        });
    });

    describe('createAssetUrlCreator()', function() {
        it('should return a function to create asset urls', function() {
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
