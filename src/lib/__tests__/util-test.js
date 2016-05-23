import '../polyfill';
import {
    openContentInsideIframe,
    openUrlInsideIframe,
    createContentUrl,
    createScript,
    createAssetUrlCreator,
    deduceBoxUrl,
    insertTemplate,
    createPrefetch,
    createStylesheet,
    getHeaders,
    prefetchAssets,
    loadStylesheets,
    loadScripts,
    decodeKeydown
} from '../util';

describe('util', () => {
    describe('openUrlInsideIframe()', () => {
        it('should return a download iframe with correct source', () => {
            const iframe = openUrlInsideIframe('foo');
            assert.equal(iframe.getAttribute('id'), 'downloadiframe');
            assert.equal(iframe.getAttribute('src'), 'foo');
        });
    });

    describe('openContentInsideIframe()', () => {
        it('should return a download iframe with correct content', () => {
            const iframe = openContentInsideIframe('foo');
            assert.equal(iframe.contentDocument.body.innerHTML, 'foo');
        });
    });

    describe('deduceBoxUrl()', () => {
        it('should return correct box.com url when no api', () => {
            assert.equal(deduceBoxUrl(), 'https://app.box.com');
        });
        it('should return correct box.com url when public api', () => {
            assert.equal(deduceBoxUrl('https://api.box.com'), 'https://app.box.com');
        });
        it('should return correct box.com url when internal api', () => {
            assert.equal(deduceBoxUrl('https://foo.dev.box.net/api'), 'https://app.foo.inside-box.net');
        });
    });

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

    describe('createPrefetch()', () => {
        it('should return a prefetch link element when a url is provided', () => {
            const url = 'foo';
            const linkEl = createPrefetch(url);
            assert.ok(linkEl instanceof HTMLElement);
            assert.equal(linkEl.tagName, 'LINK');
            assert.equal(linkEl.rel, 'prefetch');
            assert.equal(linkEl.href.indexOf(url), linkEl.href.length - url.length);
        });
    });

    describe('createStylesheet()', () => {
        it('should return a css link element when a url is provided', () => {
            const url = 'foo';
            const linkEl = createStylesheet(url);
            assert.ok(linkEl instanceof HTMLElement);
            assert.equal(linkEl.tagName, 'LINK');
            assert.equal(linkEl.rel, 'stylesheet');
            assert.equal(linkEl.type, 'text/css');
            assert.equal(linkEl.href.indexOf(url), linkEl.href.length - url.length);
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

    describe('getHeaders()', () => {
        it('should return correct headers', () => {
            const headers = getHeaders({ foo: 'bar' }, 'token', 'https://sharename');
            assert.equal(headers.foo, 'bar');
            assert.equal(headers.Authorization, 'Bearer token');
            assert.equal(headers.BoxApi, 'shared_link=https://sharename');
        });
        it('should return correct headers with password', () => {
            const headers = getHeaders({ foo: 'bar' }, 'token', 'https://sharename', 'password');
            assert.equal(headers.foo, 'bar');
            assert.equal(headers.Authorization, 'Bearer token');
            assert.equal(headers.BoxApi, 'shared_link=https://sharename&shared_link_password=password');
        });
    });

    describe('createContentUrl()', () => {
        it('should return correct content url', () => {
            const url = createContentUrl('url?foo=bar', 'token', 'https://shared name');
            assert.equal(url, 'url?foo=bar&access_token=token&shared_link=https://shared%20name');
        });
        it('should return correct content url with password', () => {
            const url = createContentUrl('url?foo=bar', 'token', 'https://shared name', 'password');
            assert.equal(url, 'url?foo=bar&access_token=token&shared_link=https://shared%20name&shared_link_password=password');
        });
    });

    describe('dom tests', () => {
        before(() => {
            fixture.setBase('src/lib');
        });

        beforeEach(() => {
            fixture.load('__tests__/util-test.html');
        });

        afterEach(() => {
            fixture.cleanup();
        });

        describe('insertTemplate()', () => {
            it('should insert template into node', () => {
                const node = document.createElement('div');
                document.querySelector('.container').appendChild(node);
                insertTemplate(node, '<div class="foo"></div>');
                assert.equal(node.firstElementChild.className, 'foo');
            });
        });

        describe('prefetchAssets()', () => {
            it('should insert links into the document', () => {
                prefetchAssets(['foo', 'bar']);
                const head = document.getElementsByTagName('head')[0];
                assert.ok(head.querySelector('link[rel="prefetch"][href="foo"]') instanceof HTMLLinkElement);
                assert.ok(head.querySelector('link[rel="prefetch"][href="bar"]') instanceof HTMLLinkElement);
            });
        });

        describe('loadStylesheets()', () => {
            it('should insert styles into the document', () => {
                loadStylesheets(['foo', 'bar']);
                const head = document.getElementsByTagName('head')[0];
                assert.ok(head.querySelector('link[rel="stylesheet"][href="foo"]') instanceof HTMLLinkElement);
                assert.ok(head.querySelector('link[rel="stylesheet"][href="bar"]') instanceof HTMLLinkElement);
            });
        });

        describe('loadScripts()', () => {
            it('should insert scripts into the document', () => {
                loadScripts(['foo', 'bar']);
                const head = document.getElementsByTagName('head')[0];
                assert.ok(head.querySelector('script[src="foo"]') instanceof HTMLScriptElement);
                assert.ok(head.querySelector('script[src="bar"]') instanceof HTMLScriptElement);
            });
        });
    });

    describe('decodeKeydown()', () => {
        it('should return empty when no key', () => {
            assert.equal(decodeKeydown({
                key: ''
            }), '');
        });
        it('should return empty when modifier and key are same', () => {
            assert.equal(decodeKeydown({
                key: 'Control',
                ctrlKey: true
            }), '');
        });
        it('should return correct with ctrl modifier', () => {
            assert.equal(decodeKeydown({
                key: '1',
                ctrlKey: true
            }), 'Control+1');
        });
        it('should return correct with shift modifier', () => {
            assert.equal(decodeKeydown({
                key: '1',
                shiftKey: true
            }), 'Shift+1');
        });
        it('should return correct with meta modifier', () => {
            assert.equal(decodeKeydown({
                key: '1',
                metaKey: true
            }), 'Meta+1');
        });
        it('should return space key', () => {
            assert.equal(decodeKeydown({
                key: ' '
            }), 'Space');
        });
        it('should return right arrow key', () => {
            assert.equal(decodeKeydown({
                key: 'Right'
            }), 'ArrowRight');
        });
        it('should return left arrow key', () => {
            assert.equal(decodeKeydown({
                key: 'Left'
            }), 'ArrowLeft');
        });
        it('should return up arrow key', () => {
            assert.equal(decodeKeydown({
                key: 'Up'
            }), 'ArrowUp');
        });
        it('should return down arrow key', () => {
            assert.equal(decodeKeydown({
                key: 'Down'
            }), 'ArrowDown');
        });
        it('should return esc key', () => {
            assert.equal(decodeKeydown({
                key: 'U+001B'
            }), 'Escape');
        });
        it('should decode correct UTF8 key', () => {
            assert.equal(decodeKeydown({
                key: 'U+0041'
            }), 'A');
        });
    });
});
