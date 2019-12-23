/* eslint-disable no-unused-expressions */
import Location from '../Location';
import * as util from '../util';
import { ERROR_CODE } from '../events';
import DownloadReachability from '../DownloadReachability';

const sandbox = sinon.sandbox.create();

describe('lib/util', () => {
    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    describe('iframe', () => {
        let iframe;

        afterEach(() => {
            if (iframe && iframe.parentElement) {
                iframe.parentElement.removeChild(iframe);
            }
        });

        describe('openUrlInsideIframe()', () => {
            it('should return a download iframe with correct source', () => {
                const src = 'admiralackbar';
                iframe = util.openUrlInsideIframe(src);

                expect(iframe.getAttribute('id')).to.equal('downloadiframe');
                expect(iframe.getAttribute('src')).to.equal(src);
            });
        });

        describe('openContentInsideIframe()', () => {
            it('should return a download iframe with content', () => {
                const content = '<div class="test">moncalamari</div>';
                iframe = util.openContentInsideIframe(content);
                expect(iframe.contentDocument.querySelector('.test')).to.exist;
            });
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

        it('should return a preload link element when a url is provided and preload is true', () => {
            const url = 'foo.js';
            const linkEl = util.createPrefetch(url, true);
            expect(linkEl instanceof HTMLElement).to.be.true;
            expect(linkEl.tagName).to.equal('LINK');
            expect(linkEl.rel).to.equal('preload');
            expect(linkEl.as).to.equal('script');
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
            expect(headers['X-Box-Client-Name']).to.equal(__NAME__);
            expect(headers['X-Box-Client-Version']).to.equal(__VERSION__);
        });

        it('should return correct headers with password', () => {
            const headers = util.getHeaders({ foo: 'bar' }, 'token', 'https://sharename', 'password');
            assert.equal(headers.foo, 'bar');
            assert.equal(headers.Authorization, 'Bearer token');
            assert.equal(headers.BoxApi, 'shared_link=https://sharename&shared_link_password=password');
            assert.equal(headers['X-Box-Client-Name'], __NAME__);
            assert.equal(headers['X-Box-Client-Version'], __VERSION__);
        });
    });

    describe('appendQueryParams()', () => {
        it('should return original url when queryParams is null', () => {
            const url = 'foo';
            expect(util.appendQueryParams(url, null)).to.equal(url);
        });

        it('should return original url when queryParams is empty object', () => {
            const url = 'foo';
            expect(util.appendQueryParams(url, {})).to.equal(url);
        });

        it('should append query params to url', () => {
            const url = 'foo';
            expect(
                util.appendQueryParams(url, {
                    foo: 'bar',
                    baz: 'boo',
                }),
            ).to.equal(`${url}/?foo=bar&baz=boo`);
        });

        it('should correctly append new query params to url', () => {
            const url = 'foo?test=hah';
            expect(
                util.appendQueryParams(url, {
                    foo: 'bar',
                    baz: 'boo',
                }),
            ).to.equal('foo/?test=hah&foo=bar&baz=boo');
        });

        it('should replace values for existing keys', () => {
            const url = 'test.com/?foo=hah';
            expect(
                util.appendQueryParams(url, {
                    foo: 'bar',
                    baz: 'boo',
                }),
            ).to.equal('test.com/?foo=bar&baz=boo');
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
            expect(util.appendAuthParams(url, token, sharedLink)).to.equal(
                `${url}/?access_token=${token}&shared_link=${sharedLink}&box_client_name=${__NAME__}&box_client_version=${__VERSION__}`,
            );
        });

        it('should return correct url with password', () => {
            const url = 'foobar';
            const token = 'sometoken';
            const sharedLink = 'someSharedLink';
            const sharedLinkPassword = 'somePass';
            expect(util.appendAuthParams(url, token, sharedLink, sharedLinkPassword)).to.equal(
                `${url}/?access_token=${token}&shared_link=${sharedLink}&shared_link_password=${sharedLinkPassword}&box_client_name=${__NAME__}&box_client_version=${__VERSION__}`,
            );
        });
    });
    /* eslint-enable no-undef */

    describe('createContentUrl()', () => {
        beforeEach(() => {
            sandbox.stub(DownloadReachability, 'isDownloadHostBlocked').returns(false);
        });
        it('should return correct content url when no asset name', () => {
            expect(util.createContentUrl('foo{+asset_path}', null)).to.equal('foo');
        });

        it('should return correct content url with asset name', () => {
            expect(util.createContentUrl('foo{+asset_path}', 'bar')).to.equal('foobar');
        });

        it('should return correct content url when no asset_path', () => {
            expect(util.createContentUrl('foo', 'bar')).to.equal('foo');
        });

        it('should replace the download host with the default if we are falling back', () => {
            DownloadReachability.isDownloadHostBlocked.returns(true);
            expect(util.createContentUrl('https://dl6.boxcloud.com', 'bar')).to.equal('https://dl.boxcloud.com');
        });
    });

    describe('createAssetUrlCreator()', () => {
        it('should return a function to create asset urls', () => {
            const location = {
                baseURI: 'base/',
                staticBaseURI: 'static/',
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
                const { head } = document;
                assert.ok(head.querySelector('link[rel="prefetch"][href="foo"]') instanceof HTMLLinkElement);
                assert.ok(head.querySelector('link[rel="prefetch"][href="bar"]') instanceof HTMLLinkElement);
            });

            it('should insert links with preload if specified', () => {
                util.prefetchAssets(['foo'], true);
                const { head } = document;
                assert.ok(head.querySelector('link[rel="preload"][href="foo"]') instanceof HTMLLinkElement);
            });
        });

        describe('loadStylesheets()', () => {
            it('should insert styles into the document', () => {
                util.loadStylesheets(['foo', 'bar']);
                const { head } = document;
                assert.ok(head.querySelector('link[rel="stylesheet"][href="foo"]') instanceof HTMLLinkElement);
                assert.ok(head.querySelector('link[rel="stylesheet"][href="bar"]') instanceof HTMLLinkElement);
            });
        });

        describe('loadScripts()', () => {
            it('should insert scripts into the document', () => {
                util.loadScripts(['foo', 'bar']).catch(() => {});
                const { head } = document;
                assert.ok(head.querySelector('script[src="foo"]') instanceof HTMLScriptElement);
                assert.ok(head.querySelector('script[src="bar"]') instanceof HTMLScriptElement);
            });

            it.skip('should disable AMD until scripts are loaded or fail to load', () => {
                /* eslint-disable require-jsdoc */
                const defineFunc = () => {};
                /* eslint-enable require-jsdoc */

                defineFunc.amd = { jquery: '' };
                window.define = defineFunc;

                const promise = util.loadScripts(['foo', 'bar'], true);
                expect(window.define).to.equal(undefined);

                return promise.then(() => {
                    expect(window.define).to.equal(defineFunc);
                });
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
            it('should return location info for the script given a script tag', () => {
                const script = document.querySelector('script[src*="/file.js"]');
                const loc = util.findScriptLocation('', script);
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
            it('should throw an error when foobar.js is not found', () => {
                expect(() => util.findScriptLocation('fobar.js')).to.throw(
                    Error,
                    /Missing or malformed fobar.js library/,
                );
            });
            it('should throw an error when foobar.js is not found via script tag', () => {
                const script = document.querySelector('script[src*="/file.js"]');
                expect(() => util.findScriptLocation('fobar.js', script)).to.throw(
                    Error,
                    /Missing or malformed fobar.js library/,
                );
            });
        });
    });

    describe('decodeKeydown()', () => {
        it('should return empty when no key', () => {
            assert.equal(
                util.decodeKeydown({
                    key: '',
                }),
                '',
            );
        });
        it('should return empty when modifier and key are same', () => {
            assert.equal(
                util.decodeKeydown({
                    key: 'Control',
                    ctrlKey: true,
                }),
                '',
            );
        });
        it('should return correct with ctrl modifier', () => {
            assert.equal(
                util.decodeKeydown({
                    key: '1',
                    ctrlKey: true,
                }),
                'Control+1',
            );
        });
        it('should return correct with shift modifier', () => {
            assert.equal(
                util.decodeKeydown({
                    key: '1',
                    shiftKey: true,
                }),
                'Shift+1',
            );
        });
        it('should return correct with meta modifier', () => {
            assert.equal(
                util.decodeKeydown({
                    key: '1',
                    metaKey: true,
                }),
                'Meta+1',
            );
        });
        it('should return space key', () => {
            assert.equal(
                util.decodeKeydown({
                    key: ' ',
                }),
                'Space',
            );
        });
        it('should return right arrow key', () => {
            assert.equal(
                util.decodeKeydown({
                    key: 'Right',
                }),
                'ArrowRight',
            );
        });
        it('should return left arrow key', () => {
            assert.equal(
                util.decodeKeydown({
                    key: 'Left',
                }),
                'ArrowLeft',
            );
        });
        it('should return up arrow key', () => {
            assert.equal(
                util.decodeKeydown({
                    key: 'Up',
                }),
                'ArrowUp',
            );
        });
        it('should return down arrow key', () => {
            assert.equal(
                util.decodeKeydown({
                    key: 'Down',
                }),
                'ArrowDown',
            );
        });
        it('should return esc key', () => {
            assert.equal(
                util.decodeKeydown({
                    key: 'U+001B',
                }),
                'Escape',
            );
        });
        it('should decode correct UTF8 key', () => {
            assert.equal(
                util.decodeKeydown({
                    key: 'U+0041',
                }),
                'A',
            );
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
        it('should return true for file name with .360 before extension', () => {
            expect(util.requires360Viewer({ name: 'name.360.foo' })).to.be.true;
        });

        it('should return false for file name ending with 360 (e.g. IMG_0360.jpg)', () => {
            expect(util.requires360Viewer({ name: 'IMG_0360.foo' })).to.be.false;
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

    describe('pageNumberFromScroll()', () => {
        it('should incrememt the page if scrolling down and scroll top has passed the midpoint of page', () => {
            const currentPageNum = 1;
            const previousScrollTop = 0;
            const currentPageEl = {
                offsetTop: 0,
                clientHeight: 200,
            };
            const wrapperEl = {
                scrollTop: 101,
                offsetHeight: 500,
            };

            const result = util.pageNumberFromScroll(currentPageNum, previousScrollTop, currentPageEl, wrapperEl);
            expect(result).to.equal(2);
        });

        it('should not change the page if scrolling down and scroll top has not passed the midpoint of page', () => {
            const currentPageNum = 1;
            const previousScrollTop = 0;
            const currentPageEl = {
                offsetTop: 0,
                clientHeight: 200,
            };
            const wrapperEl = {
                scrollTop: 99,
                offsetHeight: 500,
            };

            const result = util.pageNumberFromScroll(currentPageNum, previousScrollTop, currentPageEl, wrapperEl);
            expect(result).to.equal(1);
        });

        it('should decrement the page if scrolling up and scroll bottom has passed the midpoint of page', () => {
            const currentPageNum = 2;
            const previousScrollTop = 500;
            const currentPageEl = {
                offsetTop: 100,
                clientHeight: 200,
            };
            const wrapperEl = {
                scrollTop: 0,
                offsetHeight: 100,
            };

            const result = util.pageNumberFromScroll(currentPageNum, previousScrollTop, currentPageEl, wrapperEl);
            expect(result).to.equal(1);
        });

        it('should not change the page if scrolling up and scroll bottom has not passed the midpoint of page', () => {
            const currentPageNum = 2;
            const previousScrollTop = 500;
            const currentPageEl = {
                offsetTop: 0,
                clientHeight: 200,
            };
            const wrapperEl = {
                scrollTop: 10,
                offsetHeight: 100,
            };

            const result = util.pageNumberFromScroll(currentPageNum, previousScrollTop, currentPageEl, wrapperEl);
            expect(result).to.equal(2);
        });
    });

    describe('getMidpoint()', () => {
        it('should correctly calculate the midpoint', () => {
            const result = util.getMidpoint(10, 10, 0, 0);
            expect(result).to.deep.equal([5, 5]);
        });
    });

    describe('getDistance()', () => {
        it('should correctly calculate the distance', () => {
            const result = util.getDistance(0, 0, 6, 8);
            expect(result).to.equal(10);
        });
    });

    describe('getClosestPageToPinch()', () => {
        it('should find the closest page', () => {
            const page1 = {
                id: 1,
                offsetLeft: 0,
                offsetTop: 0,
                scrollWidth: 0,
                scrollHeight: 0,
            };
            const page2 = {
                id: 2,
                offsetLeft: 100,
                offsetTop: 0,
                scrollWidth: 100,
                scrollHeight: 0,
            };
            const visiblePages = {
                first: {
                    id: 1,
                },
                last: {
                    id: 2,
                },
            };

            const midpointStub = sandbox.stub(document, 'querySelector');
            midpointStub.onCall(0).returns(page1);
            midpointStub.onCall(1).returns(page2);

            sandbox.stub(util, 'getMidpoint').returns([0, 0]);
            sandbox.stub(util, 'getDistance').returns(100);

            const result = util.getClosestPageToPinch(0, 0, visiblePages);
            expect(result.id).to.equal(page1.id);
        });

        it('should return null if there are no pages', () => {
            let result = util.getClosestPageToPinch(0, 0, null);
            expect(result).to.equal(null);

            result = util.getClosestPageToPinch(0, 0, {
                first: null,
                last: null,
            });

            expect(result).to.equal(null);
        });
    });

    describe('stripAuthFromString()', () => {
        it('should filter the access_token property from any string', () => {
            const accessToken = 'access_token=09876512371234897012348970';
            const accessFiltered = 'access_token=[FILTERED]';
            const query = `http://www.foo.com?test=1234&${accessToken}&bar=ooo`;
            const queryFiltered = `http://www.foo.com?test=1234&${accessFiltered}&bar=ooo`;
            const random = `here's my string ${accessToken} khjfsadlkjfsad`;
            const randomFiltered = `here's my string ${accessFiltered}`; // It strips everything starting at 'access_token='

            expect(util.stripAuthFromString(query)).to.equal(queryFiltered);
            expect(util.stripAuthFromString(random)).to.equal(randomFiltered);
        });

        it('should return passed in param if not string', () => {
            const obj = { foo: 'bar' };
            expect(util.stripAuthFromString(obj)).to.equal(obj);
        });
    });

    describe('getProp()', () => {
        it('should return prop value as specified by path', () => {
            const someProp = 'some-prop';
            const a = {
                b: {
                    c: 'value',
                    b: '',
                },
                [someProp]: {
                    value: 'test',
                },
            };

            expect(util.getProp(a, 'b.c')).to.equal('value');
            expect(util.getProp(a, 'b.b')).to.equal('');
            expect(util.getProp(a, `${someProp}.value`)).to.equal('test');
        });

        it('should return default value if prop does not exist or value is undefined', () => {
            const a = {
                b: {},
                test: undefined,
                foo: null,
            };

            expect(util.getProp(a, 'b.c', 'default')).to.equal('default');
            expect(util.getProp(a, 'test', 'default')).to.equal('default');
            expect(util.getProp(a, 'foo.bar', 'default')).to.equal('default');
        });
    });

    describe('isValidFileId()', () => {
        it('should be valid if fileId is a numeric string', () => {
            expect(util.isValidFileId('1')).to.be.true;
        });

        it('should be valid if fileId is a number', () => {
            expect(util.isValidFileId(1)).to.be.true;
        });

        it('should be invalid if fileId is undefined', () => {
            expect(util.isValidFileId()).to.be.false;
        });

        it('should be invalid if fileId is NaN', () => {
            expect(util.isValidFileId(NaN)).to.be.false;
        });

        it('should be invalid if fileId is a mixed string', () => {
            expect(util.isValidFileId('1234foo')).to.be.false;
        });
    });

    describe('isBoxWebApp()', () => {
        [
            ['https://test.app.box.com', true],
            ['https://foo.ent.box.com', true],
            ['https://bar.app.boxcn.net', true],
            ['https://baz.ent.boxenterprise.net', true],
            ['https://haha.box.net', false],
            ['https://some.other.domain', false],
        ].forEach(([hostname, expectedResult]) => {
            it('should return true when window location is a Box domain', () => {
                sandbox.stub(Location, 'getHostname').returns(hostname);
                expect(util.isBoxWebApp()).to.equal(expectedResult);
            });
        });
    });

    describe('convertWatermarkPref()', () => {
        [
            ['any', ''],
            ['all', 'only_watermarked'],
            ['none', 'only_non_watermarked'],
        ].forEach(([previewWMPref, expected]) => {
            it('should convert previewWMPref to value expected by the API', () => {
                expect(util.convertWatermarkPref(previewWMPref)).to.equal(expected);
            });
        });
    });

    describe('handleRepresentationBlobFetch()', () => {
        it('should reject if the response is a 202', () => {
            const response = {
                status: 202,
            };

            util.handleRepresentationBlobFetch(response).catch(e => expect(e.code).to.equal(ERROR_CODE.DELETED_REPS));
        });

        it('should pass the response through', () => {
            const response = {
                status: 200,
                body: 'body',
            };

            util.handleRepresentationBlobFetch(response).then(passedResponse =>
                expect(passedResponse).to.equal(response),
            );
        });
    });
});
