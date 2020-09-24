/* eslint-disable no-unused-expressions */
import Location from '../Location';
import * as util from '../util';
import { ERROR_CODE } from '../events';
import DownloadReachability from '../DownloadReachability';

describe('lib/util', () => {
    describe('iframe', () => {
        let iframe;

        afterEach(() => {
            if (iframe && iframe.parentElement) {
                iframe.parentElement.removeChild(iframe);
            }
        });

        describe('openUrlInsideIframe()', () => {
            test('should return a download iframe with correct source', () => {
                const src = 'admiralackbar';
                iframe = util.openUrlInsideIframe(src);

                expect(iframe.getAttribute('id')).toBe('downloadiframe');
                expect(iframe.getAttribute('src')).toBe(src);
            });
        });

        describe('openContentInsideIframe()', () => {
            test('should return a download iframe with content', () => {
                const content = '<div class="test">moncalamari</div>';
                iframe = util.openContentInsideIframe(content);
                expect(iframe.contentDocument.querySelector('.test')).toBeDefined();
            });
        });
    });

    describe('createScript()', () => {
        test('should return a script element when a url is provided', () => {
            const url = 'foo';
            const scriptEl = util.createScript(url);
            expect(scriptEl instanceof HTMLElement).toBe(true);
            expect(scriptEl.tagName).toBe('SCRIPT');
            expect(scriptEl.src.indexOf(url) !== -1).toBe(true);
            expect(scriptEl.async).toBe(false);
        });
    });

    describe('createPrefetch()', () => {
        test('should return a prefetch link element when a url is provided', () => {
            const url = 'foo';
            const linkEl = util.createPrefetch(url);
            expect(linkEl instanceof HTMLElement).toBe(true);
            expect(linkEl.tagName).toBe('LINK');
            expect(linkEl.rel).toBe('prefetch');
            expect(linkEl.href.indexOf(url) !== -1).toBe(true);
        });

        test('should return a preload link element when a url is provided and preload is true', () => {
            const url = 'foo.js';
            const linkEl = util.createPrefetch(url, true);
            expect(linkEl instanceof HTMLElement).toBe(true);
            expect(linkEl.tagName).toBe('LINK');
            expect(linkEl.rel).toBe('preload');
            expect(linkEl.as).toBe('script');
            expect(linkEl.href.indexOf(url) !== -1).toBe(true);
        });
    });

    describe('createStylesheet()', () => {
        test('should return a css link element when a url is provided', () => {
            const url = 'foo';
            const linkEl = util.createStylesheet(url);
            expect(linkEl instanceof HTMLElement).toBe(true);
            expect(linkEl.tagName).toBe('LINK');
            expect(linkEl.rel).toBe('stylesheet');
            expect(linkEl.type).toBe('text/css');
            expect(linkEl.href.indexOf(url) !== -1).toBe(true);
        });
    });

    /* eslint-disable no-undef */
    describe('getHeaders()', () => {
        test('should return correct headers', () => {
            const sharedLink = 'https://sharename';
            const fooHeader = 'bar';
            const token = 'someToken';
            const headers = util.getHeaders({ foo: fooHeader }, token, sharedLink);
            expect(headers.foo).toBe(fooHeader);
            expect(headers.Authorization).toBe(`Bearer ${token}`);
            expect(headers.BoxApi).toBe(`shared_link=${sharedLink}`);
            expect(headers['X-Box-Client-Name']).toBe(__NAME__);
            expect(headers['X-Box-Client-Version']).toBe(__VERSION__);
        });

        test('should return correct headers with password', () => {
            const headers = util.getHeaders({ foo: 'bar' }, 'token', 'https://sharename', 'password');
            expect(headers.foo).toEqual('bar');
            expect(headers.Authorization).toEqual('Bearer token');
            expect(headers.BoxApi).toEqual('shared_link=https://sharename&shared_link_password=password');
            expect(headers['X-Box-Client-Name']).toEqual(__NAME__);
            expect(headers['X-Box-Client-Version']).toEqual(__VERSION__);
        });
    });

    describe('appendQueryParams()', () => {
        test('should return original url when queryParams is null', () => {
            const url = 'foo';
            expect(util.appendQueryParams(url, null)).toBe(url);
        });

        test('should return original url when queryParams is empty object', () => {
            const url = 'foo';
            expect(util.appendQueryParams(url, {})).toBe(url);
        });

        test('should append query params to url', () => {
            const url = 'foo';
            expect(
                util.appendQueryParams(url, {
                    foo: 'bar',
                    baz: 'boo',
                }),
            ).toBe(`${url}/?foo=bar&baz=boo`);
        });

        test('should correctly append new query params to url', () => {
            const url = 'foo?test=hah';
            expect(
                util.appendQueryParams(url, {
                    foo: 'bar',
                    baz: 'boo',
                }),
            ).toBe('foo/?test=hah&foo=bar&baz=boo');
        });

        test('should replace values for existing keys', () => {
            const url = 'test.com/?foo=hah';
            expect(
                util.appendQueryParams(url, {
                    foo: 'bar',
                    baz: 'boo',
                }),
            ).toBe('test.com/?foo=bar&baz=boo');
        });
    });

    describe('appendAuthParams()', () => {
        test('should return url when no token or shared link is provided', () => {
            const url = 'foo';
            expect(util.appendAuthParams(url)).toBe(url);
        });

        test('should append token and shared link', () => {
            const url = 'foo';
            const token = 'sometoken';
            const sharedLink = 'someSharedLink';
            expect(util.appendAuthParams(url, token, sharedLink)).toBe(
                `${url}/?access_token=${token}&shared_link=${sharedLink}&box_client_name=${__NAME__}&box_client_version=${__VERSION__}`,
            );
        });

        test('should return correct url with password', () => {
            const url = 'foobar';
            const token = 'sometoken';
            const sharedLink = 'someSharedLink';
            const sharedLinkPassword = 'somePass';
            expect(util.appendAuthParams(url, token, sharedLink, sharedLinkPassword)).toBe(
                `${url}/?access_token=${token}&shared_link=${sharedLink}&shared_link_password=${sharedLinkPassword}&box_client_name=${__NAME__}&box_client_version=${__VERSION__}`,
            );
        });
    });
    /* eslint-enable no-undef */

    describe('createContentUrl()', () => {
        beforeEach(() => {
            jest.spyOn(DownloadReachability, 'isDownloadHostBlocked').mockReturnValue(false);
        });
        test('should return correct content url when no asset name', () => {
            expect(util.createContentUrl('foo{+asset_path}', null)).toBe('foo');
        });

        test('should return correct content url with asset name', () => {
            expect(util.createContentUrl('foo{+asset_path}', 'bar')).toBe('foobar');
        });

        test('should return correct content url when no asset_path', () => {
            expect(util.createContentUrl('foo', 'bar')).toBe('foo');
        });

        test('should replace the download host with the default if we are falling back', () => {
            DownloadReachability.isDownloadHostBlocked.mockReturnValue(true);
            expect(util.createContentUrl('https://dl6.boxcloud.com', 'bar')).toBe('https://dl.boxcloud.com');
        });
    });

    describe('createAssetUrlCreator()', () => {
        test('should return a function to create asset urls', () => {
            const location = {
                baseURI: 'base/',
                staticBaseURI: 'static/',
            };
            const assetUrlCreator = util.createAssetUrlCreator(location);
            expect(typeof assetUrlCreator).toEqual('function');
            expect(assetUrlCreator('somename')).toEqual('base/somename');
            expect(assetUrlCreator('http://somename')).toEqual('http://somename');
            expect(assetUrlCreator('third-party/somename')).toEqual('static/third-party/somename');
        });
    });

    describe('DOM tests', () => {
        beforeEach(() => {
            fixture.load('__tests__/util-test.html');
        });

        afterEach(() => {
            fixture.cleanup();
        });

        describe('insertTemplate()', () => {
            test('should insert template into node', () => {
                const node = document.createElement('div');
                document.querySelector('.container').appendChild(node);
                util.insertTemplate(node, '<div class="foo"></div>');
                expect(node.firstElementChild.className).toEqual('foo');
            });
        });

        describe('prefetchAssets()', () => {
            test('should insert links into the document', () => {
                util.prefetchAssets(['foo', 'bar']);
                const { head } = document;
                expect(head.querySelector('link[rel="prefetch"][href="foo"]') instanceof HTMLLinkElement).toBeTruthy();
                expect(head.querySelector('link[rel="prefetch"][href="bar"]') instanceof HTMLLinkElement).toBeTruthy();
            });

            test('should insert links with preload if specified', () => {
                util.prefetchAssets(['foo'], true);
                const { head } = document;
                expect(head.querySelector('link[rel="preload"][href="foo"]') instanceof HTMLLinkElement).toBeTruthy();
            });
        });

        describe('loadStylesheets()', () => {
            test('should insert styles into the document', () => {
                util.loadStylesheets(['foo', 'bar']);
                const { head } = document;
                expect(
                    head.querySelector('link[rel="stylesheet"][href="foo"]') instanceof HTMLLinkElement,
                ).toBeTruthy();
                expect(
                    head.querySelector('link[rel="stylesheet"][href="bar"]') instanceof HTMLLinkElement,
                ).toBeTruthy();
            });
        });

        describe('loadScripts()', () => {
            test('should insert scripts into the document', () => {
                util.loadScripts(['foo', 'bar']).catch(() => {});
                const { head } = document;
                expect(head.querySelector('script[src="foo"]') instanceof HTMLScriptElement).toBeTruthy();
                expect(head.querySelector('script[src="bar"]') instanceof HTMLScriptElement).toBeTruthy();
            });
        });

        describe('findScriptLocation()', () => {
            test('should return location info for the script', () => {
                const loc = util.findScriptLocation('file.js');
                expect(loc.origin).toEqual('https://hostname:100');
                expect(loc.host).toEqual('hostname:100');
                expect(loc.hostname).toEqual('hostname');
                expect(loc.search).toEqual('?search');
                expect(loc.protocol).toEqual('https:');
                expect(loc.port).toEqual('100');
                expect(loc.href).toEqual('https://hostname:100/path/version/locale/file.js?search');
                expect(loc.pathname).toEqual('/path/version/locale/file.js');
                expect(loc.version).toEqual('version');
                expect(loc.baseURI).toEqual('https://hostname:100/path/version/locale/');
                expect(loc.staticBaseURI).toEqual('https://hostname:100/path/');
            });
            test('should return location info for the script given a script tag', () => {
                const script = document.querySelector('script[src*="/file.js"]');
                const loc = util.findScriptLocation('', script);
                expect(loc.origin).toEqual('https://hostname:100');
                expect(loc.host).toEqual('hostname:100');
                expect(loc.hostname).toEqual('hostname');
                expect(loc.search).toEqual('?search');
                expect(loc.protocol).toEqual('https:');
                expect(loc.port).toEqual('100');
                expect(loc.href).toEqual('https://hostname:100/path/version/locale/file.js?search');
                expect(loc.pathname).toEqual('/path/version/locale/file.js');
                expect(loc.version).toEqual('version');
                expect(loc.baseURI).toEqual('https://hostname:100/path/version/locale/');
                expect(loc.staticBaseURI).toEqual('https://hostname:100/path/');
            });
            test('should throw an error when foobar.js is not found', () => {
                expect(() => util.findScriptLocation('fobar.js')).toThrowError(Error);
            });
            test('should throw an error when foobar.js is not found via script tag', () => {
                const script = document.querySelector('script[src*="/file.js"]');
                expect(() => util.findScriptLocation('fobar.js', script)).toThrowError(Error);
            });
        });
    });

    describe('decodeKeydown()', () => {
        test('should return empty when no key', () => {
            expect(
                util.decodeKeydown({
                    key: '',
                }),
            ).toEqual('');
        });
        test('should return empty when modifier and key are same', () => {
            expect(
                util.decodeKeydown({
                    key: 'Control',
                    ctrlKey: true,
                }),
            ).toEqual('');
        });
        test('should return correct with ctrl modifier', () => {
            expect(
                util.decodeKeydown({
                    key: '1',
                    ctrlKey: true,
                }),
            ).toEqual('Control+1');
        });
        test('should return correct with shift modifier', () => {
            expect(
                util.decodeKeydown({
                    key: '1',
                    shiftKey: true,
                }),
            ).toEqual('Shift+1');
        });
        test('should return correct with meta modifier', () => {
            expect(
                util.decodeKeydown({
                    key: '1',
                    metaKey: true,
                }),
            ).toEqual('Meta+1');
        });
        test('should return space key', () => {
            expect(
                util.decodeKeydown({
                    key: ' ',
                }),
            ).toEqual('Space');
        });
        test('should return right arrow key', () => {
            expect(
                util.decodeKeydown({
                    key: 'Right',
                }),
            ).toEqual('ArrowRight');
        });
        test('should return left arrow key', () => {
            expect(
                util.decodeKeydown({
                    key: 'Left',
                }),
            ).toEqual('ArrowLeft');
        });
        test('should return up arrow key', () => {
            expect(
                util.decodeKeydown({
                    key: 'Up',
                }),
            ).toEqual('ArrowUp');
        });
        test('should return down arrow key', () => {
            expect(
                util.decodeKeydown({
                    key: 'Down',
                }),
            ).toEqual('ArrowDown');
        });
        test('should return esc key', () => {
            expect(
                util.decodeKeydown({
                    key: 'U+001B',
                }),
            ).toEqual('Escape');
        });
        test('should decode correct UTF8 key', () => {
            expect(
                util.decodeKeydown({
                    key: 'U+0041',
                }),
            ).toEqual('A');
        });
    });

    describe('replacePlaceholders()', () => {
        test('should replace only the placeholder with the custom value in the given string', () => {
            expect(util.replacePlaceholders('{1} highlighted', ['Bob'])).toBe('Bob highlighted');
        });

        test('should replace all placeholders with the custom value in the given string', () => {
            expect(util.replacePlaceholders('{1} highlighted {2}', ['Bob', 'Suzy'])).toBe('Bob highlighted Suzy');
        });

        test('should replace only placeholders that have custom value in the given string', () => {
            expect(util.replacePlaceholders('{1} highlighted {2}', ['Bob'])).toBe('Bob highlighted {2}');
        });

        test('should respect the order of placeholders when given an arbitrary order', () => {
            expect(util.replacePlaceholders('{2} highlighted {1}', ['Bob', 'Suzy'])).toBe('Suzy highlighted Bob');
        });

        test('should replace with the same value if the placeholder is repeated', () => {
            expect(util.replacePlaceholders('{2} highlighted {2}', ['Bob', 'Suzy'])).toBe('Suzy highlighted Suzy');
        });
    });

    describe('requires360Viewer()', () => {
        test('should return true for file name with .360 before extension', () => {
            expect(util.requires360Viewer({ name: 'name.360.foo' })).toBe(true);
        });

        test('should return false for file name ending with 360 (e.g. IMG_0360.jpg)', () => {
            expect(util.requires360Viewer({ name: 'IMG_0360.foo' })).toBe(false);
        });

        test('should return false for file name with no 360 before extension', () => {
            expect(util.requires360Viewer({ name: 'foo' })).toBe(false);
        });
    });

    describe('setDimensions()', () => {
        test('should set dimensions for the specified element', () => {
            const element = document.createElement('div');
            const width = 100;
            const height = 200;

            util.setDimensions(element, width, height);

            expect(element.style.width).toBe(`${width}px`);
            expect(element.style.height).toBe(`${height}px`);
        });
    });

    describe('pageNumberFromScroll()', () => {
        test('should incrememt the page if scrolling down and scroll top has passed the midpoint of page', () => {
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
            expect(result).toBe(2);
        });

        test('should not change the page if scrolling down and scroll top has not passed the midpoint of page', () => {
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
            expect(result).toBe(1);
        });

        test('should decrement the page if scrolling up and scroll bottom has passed the midpoint of page', () => {
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
            expect(result).toBe(1);
        });

        test('should not change the page if scrolling up and scroll bottom has not passed the midpoint of page', () => {
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
            expect(result).toBe(2);
        });
    });

    describe('getMidpoint()', () => {
        test('should correctly calculate the midpoint', () => {
            const result = util.getMidpoint(10, 10, 0, 0);
            expect(result).toEqual([5, 5]);
        });
    });

    describe('getDistance()', () => {
        test('should correctly calculate the distance', () => {
            const result = util.getDistance(0, 0, 6, 8);
            expect(result).toBe(10);
        });
    });

    describe('getClosestPageToPinch()', () => {
        test('should find the closest page', () => {
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

            const midpointStub = jest.spyOn(document, 'querySelector');
            midpointStub.mockReturnValueOnce(page1).mockReturnValueOnce(page2);

            jest.spyOn(util, 'getMidpoint').mockReturnValue([0, 0]);
            jest.spyOn(util, 'getDistance').mockReturnValue(100);

            const result = util.getClosestPageToPinch(0, 0, visiblePages);
            expect(result.id).toBe(page1.id);
        });

        test('should return null if there are no pages', () => {
            let result = util.getClosestPageToPinch(0, 0, null);
            expect(result).toBeNull();

            result = util.getClosestPageToPinch(0, 0, {
                first: null,
                last: null,
            });

            expect(result).toBeNull();
        });
    });

    describe('stripAuthFromString()', () => {
        test('should filter the access_token property from any string', () => {
            const accessToken = 'access_token=09876512371234897012348970';
            const accessFiltered = 'access_token=[FILTERED]';
            const query = `http://www.foo.com?test=1234&${accessToken}&bar=ooo`;
            const queryFiltered = `http://www.foo.com?test=1234&${accessFiltered}&bar=ooo`;
            const random = `here's my string ${accessToken} khjfsadlkjfsad`;
            const randomFiltered = `here's my string ${accessFiltered}`; // It strips everything starting at 'access_token='

            expect(util.stripAuthFromString(query)).toBe(queryFiltered);
            expect(util.stripAuthFromString(random)).toBe(randomFiltered);
        });

        test('should return passed in param if not string', () => {
            const obj = { foo: 'bar' };
            expect(util.stripAuthFromString(obj)).toBe(obj);
        });
    });

    describe('getProp()', () => {
        test('should return prop value as specified by path', () => {
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

            expect(util.getProp(a, 'b.c')).toBe('value');
            expect(util.getProp(a, 'b.b')).toBe('');
            expect(util.getProp(a, `${someProp}.value`)).toBe('test');
        });

        test('should return default value if prop does not exist or value is undefined', () => {
            const a = {
                b: {},
                test: undefined,
                foo: null,
            };

            expect(util.getProp(a, 'b.c', 'default')).toBe('default');
            expect(util.getProp(a, 'test', 'default')).toBe('default');
            expect(util.getProp(a, 'foo.bar', 'default')).toBe('default');
        });
    });

    describe('isValidFileId()', () => {
        test('should be valid if fileId is a numeric string', () => {
            expect(util.isValidFileId('1')).toBe(true);
        });

        test('should be valid if fileId is a number', () => {
            expect(util.isValidFileId(1)).toBe(true);
        });

        test('should be invalid if fileId is undefined', () => {
            expect(util.isValidFileId()).toBe(false);
        });

        test('should be invalid if fileId is NaN', () => {
            expect(util.isValidFileId(NaN)).toBe(false);
        });

        test('should be invalid if fileId is a mixed string', () => {
            expect(util.isValidFileId('1234foo')).toBe(false);
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
            test('should return true when window location is a Box domain', () => {
                jest.spyOn(Location, 'getHostname').mockReturnValue(hostname);
                expect(util.isBoxWebApp()).toBe(expectedResult);
            });
        });
    });

    describe('convertWatermarkPref()', () => {
        [
            ['any', ''],
            ['all', 'only_watermarked'],
            ['none', 'only_non_watermarked'],
        ].forEach(([previewWMPref, expected]) => {
            test('should convert previewWMPref to value expected by the API', () => {
                expect(util.convertWatermarkPref(previewWMPref)).toBe(expected);
            });
        });
    });

    describe('handleRepresentationBlobFetch()', () => {
        test('should reject if the response is a 202', () => {
            const response = {
                status: 202,
            };

            util.handleRepresentationBlobFetch(response).catch(e => expect(e.code).toBe(ERROR_CODE.DELETED_REPS));
        });

        test('should pass the response through', () => {
            const response = {
                status: 200,
                body: 'body',
            };

            util.handleRepresentationBlobFetch(response).then(passedResponse => expect(passedResponse).toBe(response));
        });
    });
});
