/* eslint-disable no-unused-expressions */
import Api from '../../../api';
import Browser from '../../../Browser';
import PlainTextViewer from '../PlainTextViewer';
import BaseViewer from '../../BaseViewer';
import Popup from '../../../Popup';
import TextBaseViewer from '../TextBaseViewer';
import * as util from '../../../util';
import { TEXT_STATIC_ASSETS_VERSION, SELECTOR_BOX_PREVIEW } from '../../../constants';
import { VIEWER_EVENT } from '../../../events';

const sandbox = sinon.createSandbox();
const stubs = {};
let containerEl;
let text;
let rootEl;

describe('lib/viewers/text/PlainTextViewer', () => {
    const setupFunc = BaseViewer.prototype.setup;

    beforeEach(() => {
        fixture.load('viewers/text/__tests__/PlainTextViewer-test.html');
        containerEl = document.querySelector('.container');
        rootEl = document.querySelector(SELECTOR_BOX_PREVIEW);
        stubs.api = new Api();
        text = new PlainTextViewer({
            api: stubs.api,
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

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: jest.fn() });
        text.containerEl = containerEl;
        text.rootEl = rootEl;
        text.setup();
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: setupFunc });

        if (typeof text.destroy === 'function') {
            text.destroy();
        }
        text = null;
    });

    describe('setup()', () => {
        test('should set up proper text elements and initialize print', () => {
            text = new PlainTextViewer({
                file: {
                    id: 0,
                },
                container: containerEl,
            });
            jest.spyOn(text, 'initPrint').mockImplementation();
            Object.defineProperty(BaseViewer.prototype, 'setup', { value: jest.fn() });
            text.containerEl = containerEl;

            text.setup();

            expect(text.textEl.className).toBe('bp-text bp-text-plain hljs bp-is-scrollable bp-is-hidden');
            expect(text.codeEl.parentNode === text.textEl).toBe(true);
            expect(text.truncated).toBe(false);
            expect(text.initPrint).toBeCalled();
        });
    });

    describe('destroy()', () => {
        const destroyFunc = TextBaseViewer.prototype.destroy;

        afterEach(() => {
            Object.defineProperty(TextBaseViewer.prototype, 'destroy', { value: destroyFunc });
        });

        test('should remove the download event listener if it exists', () => {
            const downloadBtnEl = text.textEl.appendChild(document.createElement('div'));
            downloadBtnEl.classList.add('bp-btn-download');
            jest.spyOn(downloadBtnEl, 'removeEventListener');

            text.destroy();

            expect(downloadBtnEl.removeEventListener).toBeCalledWith('click', expect.any(Function));
        });

        test('should call super.destroy()', () => {
            Object.defineProperty(TextBaseViewer.prototype, 'destroy', { value: jest.fn() });
            text.destroy();
        });
    });

    describe('load()', () => {
        const loadFunc = TextBaseViewer.prototype.load;

        afterEach(() => {
            Object.defineProperty(TextBaseViewer.prototype, 'load', { value: loadFunc });
        });

        test('should fetch assets and rep and call postload', () => {
            Object.defineProperty(TextBaseViewer.prototype, 'load', { value: jest.fn() });

            jest.spyOn(text, 'loadAssets').mockResolvedValue(undefined);
            jest.spyOn(text, 'getRepStatus').mockReturnValue({ getPromise: () => Promise.resolve() });
            jest.spyOn(text, 'postLoad').mockImplementation();
            jest.spyOn(text, 'setup').mockImplementation();

            return text.load().then(() => {
                expect(text.setup).not.toBeCalled();
                expect(text.postLoad).toBeCalled();
            });
        });
    });

    describe('prefetch()', () => {
        test('should prefetch assets if assets is true', () => {
            jest.spyOn(text, 'prefetchAssets').mockImplementation();
            text.prefetch({ assets: true, content: false });
            expect(text.prefetchAssets).toBeCalled();
        });

        test('should prefetch content if content is true and representation is ready', () => {
            const contentUrl = 'someContentUrl';
            jest.spyOn(text, 'createContentUrlWithAuthParams').mockReturnValue(contentUrl);
            jest.spyOn(text, 'isRepresentationReady').mockReturnValue(true);
            sandbox
                .mock(stubs.api)
                .expects('get')
                .withArgs(contentUrl, { type: 'document' });

            text.prefetch({ assets: false, content: true });
        });

        test('should not prefetch content if content is true but representation is not ready', () => {
            jest.spyOn(text, 'isRepresentationReady').mockReturnValue(false);
            sandbox
                .mock(stubs.api)
                .expects('get')
                .never();
            text.prefetch({ assets: false, content: true });
        });
    });

    describe('print()', () => {
        test('should print iframe if print is ready', () => {
            jest.spyOn(text, 'printIframe').mockImplementation();
            text.printReady = true;

            text.print();
            expect(text.printIframe).toBeCalled();
        });

        test('should prepare printing and show print popup if print is not ready', () => {
            jest.spyOn(text, 'preparePrint').mockImplementation();
            text.printReady = false;
            text.printPopup = {
                show: jest.fn(),
                disableButton: jest.fn(),
            };

            text.print();

            expect(text.preparePrint).toBeCalledWith([
                `third-party/text/${TEXT_STATIC_ASSETS_VERSION}/github.min.css`,
                'preview.css',
            ]);
            expect(text.printPopup.show).toBeCalled();
            expect(text.printPopup.disableButton).toBeCalled();
        });
    });

    describe('postLoad()', () => {
        test('should fetch text representation with access token in query param if file is small enough', () => {
            const urlWithAccessToken = 'blah';
            const getPromise = Promise.resolve('');
            text.options.file.size = 196608 - 1; // 192KB - 1

            jest.spyOn(stubs.api, 'get').mockReturnValue(getPromise);
            jest.spyOn(text, 'createContentUrlWithAuthParams').mockReturnValue(urlWithAccessToken);
            text.postLoad();

            return getPromise.then(() => {
                expect(text.truncated).toBe(false);
                expect(stubs.api.get).toBeCalledWith(urlWithAccessToken, { headers: {}, type: 'text' });
            });
        });

        test('should fetch text representation with a byte range if file size is too large', () => {
            const getPromise = Promise.resolve('');
            const url = 'url';
            const headersWithRange = { Range: 'bytes=0-196608' };
            text.options.file.size = 196608 + 1; // 192KB + 1

            jest.spyOn(stubs.api, 'get').mockReturnValue(getPromise);
            jest.spyOn(text, 'createContentUrlWithAuthParams').mockReturnValue(url);

            text.postLoad();

            return getPromise.then(() => {
                expect(text.truncated).toBe(true);
                expect(stubs.api.get).toBeCalledWith(url, { headers: headersWithRange, type: 'text' });
            });
        });

        test('should append dots to text if truncated', () => {
            const someText = 'blah';
            const getPromise = Promise.resolve(someText);
            jest.spyOn(stubs.api, 'get').mockReturnValue(getPromise);
            jest.spyOn(text, 'finishLoading');
            text.options.file.size = 196608 + 1; // 192KB + 1;

            const promise = text.postLoad();

            return promise.then(() => {
                expect(text.finishLoading).toBeCalled();
            });
        });

        test('should call initHighlightJs if file has code extension', () => {
            const someText = 'blah';
            const getPromise = Promise.resolve(someText);
            jest.spyOn(stubs.api, 'get').mockReturnValue(getPromise);
            jest.spyOn(text, 'initHighlightJs').mockImplementation();
            text.options.file.size = 196608 + 1; // 192KB + 1
            text.options.file.extension = 'js'; // code extension

            const promise = text.postLoad();

            return promise.then(() => {
                expect(text.initHighlightJs).toBeCalledWith(`${someText}...`);
            });
        });

        test('should invoke startLoadTimer()', () => {
            jest.spyOn(text, 'startLoadTimer');
            jest.spyOn(stubs.api, 'get').mockReturnValue(Promise.resolve(''));

            const someText = 'blah';
            const getPromise = Promise.resolve(someText);

            text.postLoad();

            return getPromise.then(() => {
                expect(text.startLoadTimer).toBeCalled();
            });
        });

        test('should handle a download error', () => {
            const getPromise = Promise.reject();
            jest.spyOn(stubs.api, 'get').mockReturnValue(getPromise);
            jest.spyOn(text, 'handleDownloadError');

            const promise = text.postLoad();

            return promise.catch(() => {
                expect(text.handleDownloadError).toBeCalled();
            });
        });
    });

    describe('initHighlightJs()', () => {
        const postMessageFunc = Worker.prototype.postMessage;

        afterEach(() => {
            Object.defineProperty(Worker.prototype, 'postMessage', { value: postMessageFunc });
        });

        test('should create worker and set it up with hljs and pass in the text to convert', () => {
            const hljs = 'hljs';
            const assetUrlCreatorStub = jest.fn(() => hljs);
            jest.spyOn(util, 'createAssetUrlCreator').mockReturnValue(assetUrlCreatorStub);

            const someText = 'text';
            Object.defineProperty(Worker.prototype, 'postMessage', {
                value: sandbox.mock().withArgs({
                    highlightSrc: hljs,
                    text: someText,
                }),
            });

            text.initHighlightJs(someText);

            expect(util.createAssetUrlCreator).toBeCalled();
            expect(assetUrlCreatorStub).toBeCalled();
        });
    });

    describe('initPrint()', () => {
        beforeEach(() => {
            text = new PlainTextViewer({
                file: {
                    id: 0,
                },
                container: containerEl,
            });
            Object.defineProperty(BaseViewer.prototype, 'setup', { value: jest.fn() });
            text.containerEl = containerEl;
            text.rootEl = rootEl;
            text.setup();
        });

        test('should initialize print popup', () => {
            text.initPrint();
            expect(text.printPopup instanceof Popup).toBe(true);
        });

        test('should set up print checkmark and loading indicator', () => {
            text.initPrint();
            expect(text.printPopup.loadingIndicator instanceof HTMLElement);
            expect(text.printPopup.loadingIndicator.classList.contains('bp-crawler'));
            expect(text.printPopup.printCheckmark instanceof HTMLElement);
            expect(text.printPopup.printCheckmark.classList.contains('bp-print-check'));
        });
    });

    describe('preparePrint()', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.clearAllTimers();
        });

        test('should setup the print iframe', () => {
            const appendStub = jest.fn();

            jest.spyOn(util, 'createAssetUrlCreator').mockReturnValue(jest.fn());
            jest.spyOn(util, 'openContentInsideIframe').mockReturnValue({
                contentDocument: {
                    head: {
                        appendChild: appendStub,
                    },
                },
            });
            text.options.location = 'en-US';
            jest.spyOn(window, 'setTimeout');

            text.preparePrint(['blah']);

            expect(util.createAssetUrlCreator).toBeCalledWith(text.options.location);
            expect(util.openContentInsideIframe).toBeCalledWith(text.textEl.outerHTML);
            expect(appendStub).toBeCalled();
        });

        test('should enable printing via print popup after a delay', () => {
            jest.spyOn(util, 'createAssetUrlCreator').mockReturnValue(jest.fn());
            jest.spyOn(util, 'createStylesheet');
            jest.spyOn(util, 'openContentInsideIframe').mockReturnValue({
                contentDocument: {
                    head: {
                        appendChild: jest.fn(),
                    },
                },
            });

            text.initPrint();
            jest.spyOn(text.printPopup, 'enableButton');

            text.preparePrint(['blah']);
            jest.advanceTimersByTime(5001);

            expect(text.printPopup.enableButton).toBeCalled();
            expect(text.printPopup.messageEl.textContent).toBe('Ready to print.');
            expect(text.printPopup.loadingIndicator.classList.contains('bp-is-hidden')).toBe(true);
            expect(text.printPopup.printCheckmark.classList.contains('bp-is-hidden')).toBe(false);
            expect(text.printReady).toBe(true);
        });
    });

    describe('printIframe()', () => {
        test('should focus on content window and print', () => {
            text.printframe = {
                contentWindow: {
                    focus: jest.fn(),
                    print: jest.fn(),
                },
            };
            jest.spyOn(Browser, 'getName').mockReturnValue('NotExplorer');

            text.printIframe();

            expect(text.printframe.contentWindow.focus).toBeCalled();
            expect(text.printframe.contentWindow.focus).toBeCalled();
        });
    });

    describe('finishLoading()', () => {
        test('should set code with innerHTML if highlighted', () => {
            const content = '<div>test</div>';
            text.finishLoading(content, true);
            expect(text.codeEl.innerHTML).toBe(content);
        });

        test('should set code with textContent if not highlighted', () => {
            const content = '<div>test</div>';
            text.finishLoading(content, false);
            expect(text.codeEl.textContent).toBe(content);
        });

        test('should finish loading, show the text, and emit load', () => {
            jest.spyOn(text, 'loadUI');
            jest.spyOn(text, 'emit');

            text.finishLoading('', true);

            expect(text.loadUI).toBeCalled();
            expect(text.emit).toBeCalledWith(VIEWER_EVENT.load);
            expect(text.loaded).toBe(true);
            expect(text.textEl.classList.contains('bp-is-hidden')).toBe(false);
        });

        test('should cleanup worker and show truncated download button if needed', () => {
            text.workerSrc = 'blah';
            text.truncated = true;
            jest.spyOn(text, 'showTruncatedDownloadButton');
            jest.spyOn(URL, 'revokeObjectURL').mockImplementation();

            text.finishLoading('', true);

            expect(text.showTruncatedDownloadButton).toBeCalled();
            expect(URL.revokeObjectURL).toBeCalledWith(text.workerSrc);
        });
    });

    describe('showTruncatedDownloadButton()', () => {
        test('should set up download button and bind click handler', () => {
            const bindDownload = jest.fn();
            text.download = {
                bind: jest.fn(() => bindDownload),
            };

            text.showTruncatedDownloadButton();

            expect(text.textEl.querySelector('.bp-text-truncated')).not.toBeNull();
            const downloadBtnEl = text.textEl.querySelector('.bp-btn-download');
            expect(downloadBtnEl).not.toBeNull();

            downloadBtnEl.click();
            expect(bindDownload).toBeCalled();
        });
    });

    describe('download()', () => {
        test('should emit download', () => {
            jest.spyOn(text, 'emit');
            text.download();
            expect(text.emit).toBeCalledWith(VIEWER_EVENT.download);
        });
    });
});
