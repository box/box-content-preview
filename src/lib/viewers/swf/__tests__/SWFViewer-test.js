/* eslint-disable no-unused-expressions */
import SWFViewer from '../SWFViewer';
import BaseViewer from '../../BaseViewer';

const sandbox = sinon.createSandbox();
let swf;
let containerEl;

describe('lib/viewers/SWFViewer', () => {
    const setupFunc = BaseViewer.prototype.setup;

    beforeAll(() => {
        Object.defineProperty(window, 'swfobject', { value: { embedSWF: () => {} } });
    });

    beforeEach(() => {
        fixture.load('viewers/swf/__tests__/SWFViewer-test.html');
        containerEl = document.querySelector('.container');
        swf = new SWFViewer({
            file: {
                id: 0,
                permissions: {
                    can_download: true,
                },
            },
            container: containerEl,
            representation: {
                content: {
                    url_template: 'foo',
                },
            },
        });

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: sandbox.mock() });
        swf.containerEl = containerEl;
        swf.setup();
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: setupFunc });

        if (swf && typeof swf.destroy === 'function') {
            swf.destroy();
        }
        swf = null;
    });

    describe('load()', () => {
        const baseLoad = BaseViewer.prototype.load;
        afterAll(() => {
            Object.defineProperty(BaseViewer.prototype, 'load', { value: baseLoad });
        });

        test('should fetch assets and call postload', () => {
            Object.defineProperty(BaseViewer.prototype, 'load', { value: sandbox.mock() });

            jest.spyOn(swf, 'loadAssets').mockResolvedValue(undefined);
            jest.spyOn(swf, 'postLoad');
            jest.spyOn(swf, 'setup');

            return swf.load().then(() => {
                expect(swf.setup).not.toBeCalled();
                expect(swf.postLoad).toBeCalled();
            });
        });

        test('should invoke startLoadTimer()', () => {
            Object.defineProperty(BaseViewer.prototype, 'load', { value: sandbox.mock() });

            jest.spyOn(swf, 'loadAssets').mockResolvedValue(undefined);
            jest.spyOn(swf, 'setup');

            jest.spyOn(swf, 'startLoadTimer');

            return swf.load().then(() => {
                expect(swf.startLoadTimer).toBeCalled();
            });
        });
    });

    describe('postLoad()', () => {
        test('should call embedSWF', () => {
            const contentUrl = 'someurl';
            sandbox
                .mock(window.swfobject)
                .expects('embedSWF')
                .withArgs(
                    contentUrl,
                    'flash-player',
                    '100%',
                    '100%',
                    '9',
                    null,
                    null,
                    {
                        allowfullscreen: 'true',
                        allowFullScreen: 'true',
                        allownetworking: 'none',
                        allowNetworking: 'none',
                        allowscriptaccess: 'never',
                        allowScriptAccess: 'never',
                        wmode: 'transparent',
                    },
                    null,
                    sinon.match.func,
                );
            jest.spyOn(swf, 'createContentUrlWithAuthParams').mockReturnValue(contentUrl);

            swf.postLoad();
        });
    });

    describe('prefetch()', () => {
        test('should prefetch assets if assets is true', () => {
            swf.prefetchAssets = jest.fn();
            swf.prefetch({ assets: true });

            expect(swf.prefetchAssets).toBeCalled();
        });
    });
});
