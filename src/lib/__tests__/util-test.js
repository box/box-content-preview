/* eslint-disable no-unused-expressions */
import 'isomorphic-fetch';
import fetchMock from 'fetch-mock';
import * as util from '../util';

describe('lib/util', () => {
    describe('get()', () => {
        const url = 'foo?bar=bum';

        afterEach(() => {
            fetchMock.restore();
        });

        it('should call fetch on the URL', () => {
            fetchMock.get(url, {});
            return util.get(url).then(() => {
                expect(fetchMock.called(url)).to.be.true;
            });
        });

        it('should call fetch on URL but fail when status is 404', () => {
            fetchMock.get(url, { status: 404 });
            return util.get(url).catch((err) => {
                expect(fetchMock.called(url)).to.be.true;
                expect(err.response.status).to.equal(404);
                expect(err.response.statusText).to.equal('Not Found');
            });
        });

        it('should call fetch on URL with headers', () => {
            const headers = { darth: 'vader' };
            fetchMock.get(url, {});

            return util.get(url, headers).then(() => {
                expect(fetchMock.called(url)).to.be.true;
                expect(fetchMock.lastOptions(url).headers).to.deep.equal(headers);
            });
        });

        it('should call fetch on URL with headers and type text', () => {
            const responseText = 'lukeskywalker';
            const headers = { baz: 'but' };
            fetchMock.get(url, {
                body: responseText,
                sendAsJson: false
            });

            return util.get(url, headers, 'text').then((response) => {
                expect(fetchMock.called(url)).to.be.true;
                expect(response).to.equal(responseText);
                expect(fetchMock.lastOptions(url).headers).to.deep.equal(headers);
            });
        });

        it('should call fetch on URL with type blob', () => {
            const blob = new Blob(['text'], { type: 'text/plain' });
            fetchMock.get(url, {
                body: blob,
                sendAsJson: false
            });

            return util.get(url, 'blob').then((response) => {
                expect(fetchMock.called(url)).to.be.true;
                expect(response).to.deep.equal(blob);
            });
        });

        it('should call fetch on URL with type text', () => {
            const responseText = 'darthsidious';
            fetchMock.get(url, {
                body: responseText,
                sendAsJson: false
            });

            return util.get(url, 'text').then((response) => {
                expect(fetchMock.called(url)).to.be.true;
                expect(response).to.equal(responseText);
            });
        });

        it('should call get on URL with type any', () => {
            fetchMock.get(url, {
                body: 'greedo',
                sendAsJson: false
            });

            return util.get(url, 'any').then((response) => {
                expect(fetchMock.called(url)).to.be.true;
                expect(response).to.be.an.object;
            });
        });
    });

    describe('post()', () => {
        afterEach(() => {
            fetchMock.restore();
        });

        it('should call post on URL', () => {
            const url = 'someurl';
            const data = { bar: 'bum' };
            const headers = { baz: 'but' };

            fetchMock.post(url, {
                body: {
                    foo: 'bar'
                }
            });

            return util.post(url, headers, data).then(() => {
                expect(JSON.parse(fetchMock.lastOptions(url).body)).to.deep.equal(data);
                expect(fetchMock.lastOptions(url).headers).to.deep.equal(headers);
            });
        });
    });

    describe('del()', () => {
        afterEach(() => {
            fetchMock.restore();
        });

        it('should call delete on URL', () => {
            const url = 'someurl';
            const data = { bar: 'bum' };
            const headers = { baz: 'but' };

            fetchMock.delete(url, {
                body: {
                    foo: 'bar'
                }
            });

            return util.del(url, headers, data).then(() => {
                expect(JSON.parse(fetchMock.lastOptions(url).body)).to.deep.equal(data);
                expect(fetchMock.lastOptions(url).headers).to.deep.equal(headers);
            });
        });
    });

    describe('put()', () => {
        afterEach(() => {
            fetchMock.restore();
        });

        it('should call put on URL', () => {
            const url = 'someurl';
            const data = { bar: 'bum' };
            const headers = { baz: 'but' };

            fetchMock.put(url, {
                body: {
                    foo: 'bar'
                }
            });

            return util.put(url, headers, data).then(() => {
                expect(JSON.parse(fetchMock.lastOptions(url).body)).to.deep.equal(data);
                expect(fetchMock.lastOptions(url).headers).to.deep.equal(headers);
            });
        });
    });

    describe('openUrlInsideIframe()', () => {
        it('should return a download iframe with correct source', () => {
            const src = 'admiralackbar';
            const iframe = util.openUrlInsideIframe(src);
            expect(iframe.getAttribute('id')).to.equal('downloadiframe');
            expect(iframe.getAttribute('src')).to.equal(src);
        });
    });

    describe('openContentInsideIframe()', () => {
        it('should return a download iframe with correct content', () => {
            const src = 'moncalamari';
            const iframe = util.openContentInsideIframe(src);
            expect(iframe.contentDocument.body.innerHTML).to.equal(src);
        });
    });

    describe('createScript()', () => {
        it('should return a script element when a url is provided', () => {
            const url = 'foo';
            const scriptEl = util.createScript(url);
            expect(scriptEl instanceof HTMLElement).to.be.true;
            expect(scriptEl.tagName).to.equal('SCRIPT');
            expect(scriptEl.src.indexOf(url) !== -1).to.be.true;
            expect(scriptEl.async).to.be.false;
        });
    });

    describe('createPrefetch()', () => {
        it('should return a prefetch link element when a url is provided', () => {
            const url = 'foo';
            const linkEl = util.createPrefetch(url);
            expect(linkEl instanceof HTMLElement).to.be.true;
            expect(linkEl.tagName).to.equal('LINK');
            expect(linkEl.rel).to.equal('prefetch');
            expect(linkEl.href.indexOf(url) !== -1).to.be.true;
        });
    });

    describe('createStylesheet()', () => {
        it('should return a css link element when a url is provided', () => {
            const url = 'foo';
            const linkEl = util.createStylesheet(url);
            expect(linkEl instanceof HTMLElement).to.be.true;
            expect(linkEl.tagName).to.equal('LINK');
            expect(linkEl.rel).to.equal('stylesheet');
            expect(linkEl.type).to.equal('text/css');
            expect(linkEl.href.indexOf(url) !== -1).to.be.true;
        });
    });

    /* eslint-disable no-undef */
    describe('getHeaders()', () => {
        it('should return correct headers', () => {
            const sharedLink = 'https://sharename';
            const fooHeader = 'bar';
            const token = 'someToken';
            const headers = util.getHeaders({ foo: fooHeader }, token, sharedLink);
            expect(headers.foo).to.equal(fooHeader);
            expect(headers.Authorization).to.equal(`Bearer ${token}`);
            expect(headers.BoxApi).to.equal(`shared_link=${sharedLink}`);
            expect(headers['X-Box-Client-Name']).to.equal('box-content-preview');
            expect(headers['X-Box-Client-Version']).to.equal(__VERSION__);
        });

        it('should return correct headers with password', () => {
            const headers = util.getHeaders({ foo: 'bar' }, 'token', 'https://sharename', 'password');
            assert.equal(headers.foo, 'bar');
            assert.equal(headers.Authorization, 'Bearer token');
            assert.equal(headers.BoxApi, 'shared_link=https://sharename&shared_link_password=password');
            assert.equal(headers['X-Box-Client-Name'], 'box-content-preview');
            assert.equal(headers['X-Box-Client-Version'], __VERSION__);
        });
    });

    describe('appendAuthParams()', () => {
        it('should return url when no token or shared link is provided', () => {
            const url = 'foo';
            expect(util.appendAuthParams(url)).to.equal(url);
        });

        it('should append token and shared link', () => {
            const url = 'foo';
            const token = 'sometoken';
            const sharedLink = 'someSharedLink';
            expect(util.appendAuthParams(url, token, sharedLink)).to.equal(`${url}?access_token=${token}&shared_link=${sharedLink}&box_client_name=box-content-preview&box_client_version=${__VERSION__}`);
        });

        it('should return correct url with password', () => {
            const url = 'foobar';
            const token = 'sometoken';
            const sharedLink = 'someSharedLink';
            const sharedLinkPassword = 'somePass';
            expect(util.appendAuthParams(url, token, sharedLink, sharedLinkPassword)).to.equal(`foobar?access_token=${token}&shared_link=${sharedLink}&shared_link_password=${sharedLinkPassword}&box_client_name=box-content-preview&box_client_version=${__VERSION__}`);
        });
    });
    /* eslint-enable no-undef */

    describe('createContentUrl()', () => {
        it('should return correct content url when no asset name', () => {
            expect(util.createContentUrl('foo{+asset_path}', null)).to.equal('foo');
        });

        it('should return correct content url with asset name', () => {
            expect(util.createContentUrl('foo{+asset_path}', 'bar')).to.equal('foobar');
        });

        it('should return correct content url when no asset_path', () => {
            expect(util.createContentUrl('foo', 'bar')).to.equal('foo');
        });
    });

    describe('createAssetUrlCreator()', () => {
        it('should return a function to create asset urls', () => {
            const location = {
                baseURI: 'base/',
                staticBaseURI: 'static/'
            };
            const assetUrlCreator = util.createAssetUrlCreator(location);
            assert.equal(typeof assetUrlCreator, 'function');
            assert.equal(assetUrlCreator('somename'), 'base/somename');
            assert.equal(assetUrlCreator('http://somename'), 'http://somename');
            assert.equal(assetUrlCreator('third-party/somename'), 'static/third-party/somename');
        });
    });

    describe('DOM tests', () => {
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
                util.insertTemplate(node, '<div class="foo"></div>');
                assert.equal(node.firstElementChild.className, 'foo');
            });
        });

        describe('prefetchAssets()', () => {
            it('should insert links into the document', () => {
                util.prefetchAssets(['foo', 'bar']);
                const head = document.head;
                assert.ok(head.querySelector('link[rel="prefetch"][href="foo"]') instanceof HTMLLinkElement);
                assert.ok(head.querySelector('link[rel="prefetch"][href="bar"]') instanceof HTMLLinkElement);
            });
        });

        describe('loadStylesheets()', () => {
            it('should insert styles into the document', () => {
                util.loadStylesheets(['foo', 'bar']);
                const head = document.head;
                assert.ok(head.querySelector('link[rel="stylesheet"][href="foo"]') instanceof HTMLLinkElement);
                assert.ok(head.querySelector('link[rel="stylesheet"][href="bar"]') instanceof HTMLLinkElement);
            });
        });

        describe('loadScripts()', () => {
            it('should insert scripts into the document', () => {
                util.loadScripts(['foo', 'bar']).catch(() => {});
                const head = document.head;
                assert.ok(head.querySelector('script[src="foo"]') instanceof HTMLScriptElement);
                assert.ok(head.querySelector('script[src="bar"]') instanceof HTMLScriptElement);
            });
        });

        describe('findScriptLocation()', () => {
            it('should return location info for the script', () => {
                const loc = util.findScriptLocation('file.js');
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
                assert.equal(loc.staticBaseURI, 'https://hostname:100/path/');
            });
        });
    });

    describe('decodeKeydown()', () => {
        it('should return empty when no key', () => {
            assert.equal(util.decodeKeydown({
                key: ''
            }), '');
        });
        it('should return empty when modifier and key are same', () => {
            assert.equal(util.decodeKeydown({
                key: 'Control',
                ctrlKey: true
            }), '');
        });
        it('should return correct with ctrl modifier', () => {
            assert.equal(util.decodeKeydown({
                key: '1',
                ctrlKey: true
            }), 'Control+1');
        });
        it('should return correct with shift modifier', () => {
            assert.equal(util.decodeKeydown({
                key: '1',
                shiftKey: true
            }), 'Shift+1');
        });
        it('should return correct with meta modifier', () => {
            assert.equal(util.decodeKeydown({
                key: '1',
                metaKey: true
            }), 'Meta+1');
        });
        it('should return space key', () => {
            assert.equal(util.decodeKeydown({
                key: ' '
            }), 'Space');
        });
        it('should return right arrow key', () => {
            assert.equal(util.decodeKeydown({
                key: 'Right'
            }), 'ArrowRight');
        });
        it('should return left arrow key', () => {
            assert.equal(util.decodeKeydown({
                key: 'Left'
            }), 'ArrowLeft');
        });
        it('should return up arrow key', () => {
            assert.equal(util.decodeKeydown({
                key: 'Up'
            }), 'ArrowUp');
        });
        it('should return down arrow key', () => {
            assert.equal(util.decodeKeydown({
                key: 'Down'
            }), 'ArrowDown');
        });
        it('should return esc key', () => {
            assert.equal(util.decodeKeydown({
                key: 'U+001B'
            }), 'Escape');
        });
        it('should decode correct UTF8 key', () => {
            assert.equal(util.decodeKeydown({
                key: 'U+0041'
            }), 'A');
        });
    });

    describe('replacePlaceholders()', () => {
        it('should replace only the placeholder with the custom value in the given string', () => {
            expect(util.replacePlaceholders('{1} highlighted', ['Bob'])).to.equal('Bob highlighted');
        });

        it('should replace all placeholders with the custom value in the given string', () => {
            expect(util.replacePlaceholders('{1} highlighted {2}', ['Bob', 'Suzy'])).to.equal('Bob highlighted Suzy');
        });

        it('should replace only placeholders that have custom value in the given string', () => {
            expect(util.replacePlaceholders('{1} highlighted {2}', ['Bob'])).to.equal('Bob highlighted {2}');
        });

        it('should respect the order of placeholders when given an arbitrary order', () => {
            expect(util.replacePlaceholders('{2} highlighted {1}', ['Bob', 'Suzy'])).to.equal('Suzy highlighted Bob');
        });

        it('should replace with the same value if the placeholder is repeated', () => {
            expect(util.replacePlaceholders('{2} highlighted {2}', ['Bob', 'Suzy'])).to.equal('Suzy highlighted Suzy');
        });
    });

    describe('requires360Viewer()', () => {
        it('should return true for file name with 360 before extension', () => {
            expect(util.requires360Viewer({ name: '360.foo' })).to.be.true;
        });

        it('should return false for file name with no 360 before extension', () => {
            expect(util.requires360Viewer({ name: 'foo' })).to.be.false;
        });
    });

    describe('setDimensions()', () => {
        it('should set dimensions for the specified element', () => {
            const element = document.createElement('div');
            const width = 100;
            const height = 200;

            util.setDimensions(element, width, height);

            expect(element.style.width).to.equal(`${width}px`);
            expect(element.style.height).to.equal(`${height}px`);
        });
    });

    describe('requires360Viewer()', () => {
        it('should return true for file name with 360 before extension', () => {
            expect(util.requires360Viewer({ name: '360.foo' })).to.be.true;
        });

        it('should return false for file name with no 360 before extension', () => {
            expect(util.requires360Viewer({ name: 'foo' })).to.be.false;
        });
    });
});
