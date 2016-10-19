import 'isomorphic-fetch';
import fetchMock from 'fetch-mock';
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
    decodeKeydown,
    findScriptLocation,
    get,
    post,
    del,
    put,
    checkStatus,
    replacePlaceholders
} from '../util';

describe('util', () => {
    describe('checkStatus()', () => {
        it('should return the response if it is some kind of 200', () => {
            const responsePromise = new Promise((resolve) => {
                resolve({ status: 200, statusText: 'success' });
            });
            responsePromise.then(checkStatus).then((value) => {
                expect(value.status).to.equal(200);
            });
        });

        it('should throw an error if the response is not successful', () => {
            const responsePromise = new Promise((resolve) => {
                resolve({ status: 400, statusText: 'error' });
            });
            try {
                responsePromise.then(checkStatus);
            } catch (e) {
                expect(e.response).to.equal('error');
            }
        });
    });

    describe('xhr()', () => {
        afterEach(() => {
            fetchMock.restore();
        });

        it('should call get on URL', (done) => {
            const url = 'foo?bar=bum';

            fetchMock.get('foo?bar=bum', {
                body: {
                    foo: 'bar'
                }
            });

            get(url).then(() => {
                /* eslint-disable no-unused-expressions */
                expect(fetchMock.called('foo?bar=bum')).to.be.true;
                /* eslint-enable no-unused-expressions */
                done();
            });
        });

        it('should call get on URL but fail with 404', (done) => {
            const url = 'foo?bar=bum';

            fetchMock.get('foo?bar=bum', {
                body: {
                    foo: 'bar'
                },
                status: 404
            });

            get(url).then(() => {
                done('Should have failed');
            }).catch((err) => {
                /* eslint-disable no-unused-expressions */
                expect(fetchMock.called('foo?bar=bum')).to.be.true;
                expect(err.response.status).to.equal(404);
                expect(err.response.statusText).to.equal('Not Found');
                /* eslint-enable no-unused-expressions */
                done();
            });
        });

        it('should call get on URL with headers', (done) => {
            const url = 'foo?bar=bum';
            const headers = { baz: 'but' };

            fetchMock.get('foo?bar=bum', {
                body: {
                    foo: 'bar'
                }
            });

            // Don't know how to check headers
            get(url, headers).then(() => {
                /* eslint-disable no-unused-expressions */
                expect(fetchMock.called('foo?bar=bum')).to.be.true;
                expect(fetchMock.lastOptions('foo?bar=bum').headers).to.deep.equal(headers);
                /* eslint-enable no-unused-expressions */
                done();
            });
        });

        it('should call get on URL with headers and type text', (done) => {
            const url = 'foo?bar=bum';
            const headers = { baz: 'but' };

            fetchMock.get('foo?bar=bum', {
                body: 'texttext',
                sendAsJson: false
            });

            // Don't know how to check headers
            get(url, headers, 'text').then((response) => {
                /* eslint-disable no-unused-expressions */
                expect(fetchMock.called('foo?bar=bum')).to.be.true;
                expect(response).to.equal('texttext');
                expect(fetchMock.lastOptions('foo?bar=bum').headers).to.deep.equal(headers);
                /* eslint-enable no-unused-expressions */
                done();
            });
        });

        it('should call get on URL with type blob', (done) => {
            const url = 'foo?bar=bum';
            const blob = new Blob(['text'], { type: 'text/plain' });

            fetchMock.get('foo?bar=bum', {
                body: blob,
                sendAsJson: false
            });

            get(url, 'blob').then((response) => {
                /* eslint-disable no-unused-expressions */
                expect(fetchMock.called('foo?bar=bum')).to.be.true;
                expect(response).to.deep.equal(blob);
                /* eslint-enable no-unused-expressions */
                done();
            });
        });

        it('should call get on URL with type text', (done) => {
            const url = 'foo?bar=bum';

            fetchMock.get('foo?bar=bum', {
                body: 'texttext',
                sendAsJson: false
            });

            // Don't know how to check headers
            get(url, 'text').then((response) => {
                /* eslint-disable no-unused-expressions */
                expect(fetchMock.called('foo?bar=bum')).to.be.true;
                expect(response).to.equal('texttext');
                /* eslint-enable no-unused-expressions */
                done();
            });
        });

        it('should call get on URL with type any', (done) => {
            const url = 'foo?bar=bum';

            fetchMock.get('foo?bar=bum', {
                body: 'texttext',
                sendAsJson: false
            });

            // Don't know how to check headers
            get(url, 'any').then((response) => {
                /* eslint-disable no-unused-expressions */
                expect(fetchMock.called('foo?bar=bum')).to.be.true;
                expect(typeof response === 'object').to.be.true;
                /* eslint-enable no-unused-expressions */
                done();
            });
        });

        it('should call post on URL', (done) => {
            const url = 'foo';
            const data = { bar: 'bum' };
            const headers = { baz: 'but' };

            fetchMock.post('foo', {
                body: {
                    foo: 'bar'
                }
            });

            post(url, headers, data).then(() => {
                /* eslint-disable no-unused-expressions */
                expect(JSON.parse(fetchMock.lastOptions('foo').body)).to.deep.equal(data);
                expect(fetchMock.lastOptions('foo').headers).to.deep.equal(headers);
                /* eslint-enable no-unused-expressions */
                done();
            });
        });

        it('should call put on URL', (done) => {
            const url = 'foo';
            const data = { bar: 'bum' };
            const headers = { baz: 'but' };

            fetchMock.put('foo', {
                body: {
                    foo: 'bar'
                }
            });

            put(url, headers, data).then(() => {
                /* eslint-disable no-unused-expressions */
                expect(JSON.parse(fetchMock.lastOptions('foo').body)).to.deep.equal(data);
                expect(fetchMock.lastOptions('foo').headers).to.deep.equal(headers);
                /* eslint-enable no-unused-expressions */
                done();
            });
        });

        it('should call delete on URL', (done) => {
            const url = 'foo';
            const data = { bar: 'bum' };
            const headers = { baz: 'but' };

            fetchMock.delete('foo', {
                body: {
                    foo: 'bar'
                }
            });

            del(url, headers, data).then(() => {
                /* eslint-disable no-unused-expressions */
                expect(JSON.parse(fetchMock.lastOptions('foo').body)).to.deep.equal(data);
                expect(fetchMock.lastOptions('foo').headers).to.deep.equal(headers);
                /* eslint-enable no-unused-expressions */
                done();
            });
        });
    });

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
                loadScripts(['foo', 'bar']).catch(() => {});
                const head = document.getElementsByTagName('head')[0];
                assert.ok(head.querySelector('script[src="foo"]') instanceof HTMLScriptElement);
                assert.ok(head.querySelector('script[src="bar"]') instanceof HTMLScriptElement);
            });
        });

        describe('findScriptLocation()', () => {
            it('should return location info for the script', () => {
                const loc = findScriptLocation('file.js');
                assert.equal(loc.origin, 'https://hostname:100');
                assert.equal(loc.host, 'hostname:100');
                assert.equal(loc.hostname, 'hostname');
                assert.equal(loc.search, '?search');
                assert.equal(loc.protocol, 'https:');
                assert.equal(loc.port, '100');
                assert.equal(loc.href, 'https://hostname:100/path/version/locale/file.js?search');
                assert.equal(loc.pathname, '/path/version/locale/file.js');
                assert.equal(loc.version, 'version');
                assert.equal(loc.baseURI, 'https://hostname:100/path/version/locale/');
                assert.equal(loc.staticBaseURI, 'https://hostname:100/path/version/');
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

    describe('replacePlaceholders()', () => {
        it('should replace only the placeholder with the custom value in the given string', () => {
            expect(replacePlaceholders('{1} highlighted', ['Bob'])).to.equal('Bob highlighted');
        });

        it('should replace all placeholders with the custom value in the given string', () => {
            expect(replacePlaceholders('{1} highlighted {2}', ['Bob', 'Suzy'])).to.equal('Bob highlighted Suzy');
        });

        it('should replace only placeholders that have custom value in the given string', () => {
            expect(replacePlaceholders('{1} highlighted {2}', ['Bob'])).to.equal('Bob highlighted {2}');
        });

        it('should respect the order of placeholders when given an arbitrary order', () => {
            expect(replacePlaceholders('{2} highlighted {1}', ['Bob', 'Suzy'])).to.equal('Suzy highlighted Bob');
        });

        it('should replace with the same value if the placeholder is repeated', () => {
            expect(replacePlaceholders('{2} highlighted {2}', ['Bob', 'Suzy'])).to.equal('Suzy highlighted Suzy');
        });
    });
});
