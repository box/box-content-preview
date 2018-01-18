/* eslint-disable no-unused-expressions */
import Browser from '../../../Browser';
import PlainTextViewer from '../PlainTextViewer';
import BaseViewer from '../../BaseViewer';
import Popup from '../../../Popup';
import TextBaseViewer from '../TextBaseViewer';
import * as util from '../../../util';
import { TEXT_STATIC_ASSETS_VERSION } from '../../../constants';
import { VIEWER_EVENT } from '../../../events';

let containerEl;
let text;
const sandbox = sinon.sandbox.create();

describe('lib/viewers/text/PlainTextViewer', () => {
    const setupFunc = BaseViewer.prototype.setup;

    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/text/__tests__/PlainTextViewer-test.html');
        containerEl = document.querySelector('.container');
        text = new PlainTextViewer({
            file: {
                id: 0,
                permissions: {
                    can_download: true
                }
            },
            container: containerEl,
            representation: {
                content: {
                    url_template: 'foo'
                }
            }
        });

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: sandbox.stub() });
        text.containerEl = containerEl;
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
        it('should set up proper text elements and initialize print', () => {
            text = new PlainTextViewer({
                file: {
                    id: 0
                },
                container: containerEl
            });
            sandbox.stub(text, 'initPrint');
            Object.defineProperty(BaseViewer.prototype, 'setup', { value: sandbox.stub() });
            text.containerEl = containerEl;

            text.setup();

            expect(text.textEl.className).to.equal('bp-text bp-text-plain hljs bp-is-hidden');
            expect(text.codeEl.parentNode === text.textEl).to.be.true;
            expect(text.truncated).to.be.false;
            expect(text.initPrint).to.be.called;
        });
    });

    describe('destroy()', () => {
        const destroyFunc = TextBaseViewer.prototype.destroy;

        afterEach(() => {
            Object.defineProperty(TextBaseViewer.prototype, 'destroy', { value: destroyFunc });
        });

        it('should remove the download event listener if it exists', () => {
            const downloadBtnEl = text.textEl.appendChild(document.createElement('div'));
            downloadBtnEl.classList.add('bp-btn-download');
            sandbox.stub(downloadBtnEl, 'removeEventListener');

            text.destroy();

            expect(downloadBtnEl.removeEventListener).to.be.calledWith('click', sinon.match.func);
        });

        it('should call super.destroy()', () => {
            Object.defineProperty(TextBaseViewer.prototype, 'destroy', { value: sandbox.mock() });
            text.destroy();
        });
    });

    describe('load()', () => {
        const loadFunc = TextBaseViewer.prototype.load;

        afterEach(() => {
            Object.defineProperty(TextBaseViewer.prototype, 'load', { value: loadFunc });
        });

        it('should fetch assets and rep and call postload', () => {
            Object.defineProperty(TextBaseViewer.prototype, 'load', { value: sandbox.mock() });

            sandbox.stub(text, 'loadAssets').returns(Promise.resolve());
            sandbox.stub(text, 'getRepStatus').returns({ getPromise: () => Promise.resolve() });
            sandbox.stub(text, 'postLoad');
            sandbox.stub(text, 'setup');

            return text.load().then(() => {
                expect(text.setup).to.be.called;
                expect(text.postLoad).to.be.called;
            });
        });
    });

    describe('prefetch()', () => {
        it('should prefetch assets if assets is true', () => {
            sandbox.stub(text, 'prefetchAssets');
            text.prefetch({ assets: true, content: false });
            expect(text.prefetchAssets).to.be.called;
        });

        it('should prefetch content if content is true and representation is ready', () => {
            const contentUrl = 'someContentUrl';
            sandbox.stub(text, 'createContentUrlWithAuthParams').returns(contentUrl);
            sandbox.stub(text, 'isRepresentationReady').returns(true);
            sandbox.mock(util).expects('get').withArgs(contentUrl, 'any');

            text.prefetch({ assets: false, content: true });
        });

        it('should not prefetch content if content is true but representation is not ready', () => {
            sandbox.stub(text, 'isRepresentationReady').returns(false);
            sandbox.mock(util).expects('get').never();
            text.prefetch({ assets: false, content: true });
        });
    });

    describe('print()', () => {
        it('should print iframe if print is ready', () => {
            sandbox.stub(text, 'printIframe');
            text.printReady = true;

            text.print();
            expect(text.printIframe).to.be.called;
        });

        it('should prepare printing and show print popup if print is not ready', () => {
            sandbox.stub(text, 'preparePrint');
            text.printReady = false;
            text.printPopup = {
                show: sandbox.stub(),
                disableButton: sandbox.stub()
            };

            text.print();

            expect(text.preparePrint).to.be.calledWith([
                `third-party/text/${TEXT_STATIC_ASSETS_VERSION}/github.min.css`,
                'preview.css'
            ]);
            expect(text.printPopup.show).to.be.called;
            expect(text.printPopup.disableButton).to.be.called;
        });
    });

    describe('postLoad()', () => {
        it('should fetch text representation with access token in query param if file is small enough', () => {
            const urlWithAccessToken = 'blah';
            const getPromise = Promise.resolve('');
            text.options.file.size = 196608 - 1; // 192KB - 1

            sandbox.stub(util, 'get').returns(getPromise);
            sandbox.stub(text, 'createContentUrlWithAuthParams').returns(urlWithAccessToken);
            text.postLoad();

            return getPromise.then(() => {
                expect(text.truncated).to.be.false;
                expect(util.get).to.be.calledWith(urlWithAccessToken, {}, 'text');
            });
        });

        it('should fetch text representation with a byte range if file size is too large', () => {
            const getPromise = Promise.resolve('');
            const url = 'url';
            const headersWithRange = { Range: 'bytes=0-196608' };
            text.options.file.size = 196608 + 1; // 192KB + 1

            sandbox.stub(util, 'get').returns(getPromise);
            sandbox.stub(text, 'createContentUrlWithAuthParams').returns(url);

            text.postLoad();

            return getPromise.then(() => {
                expect(text.truncated).to.be.true;
                expect(util.get).to.be.calledWith(url, headersWithRange, 'text');
            });
        });

        it('should append dots to text if truncated', () => {
            const someText = 'blah';
            const getPromise = Promise.resolve(someText);
            sandbox.stub(util, 'get').returns(getPromise);
            sandbox.stub(text, 'finishLoading');
            text.options.file.size = 196608 + 1; // 192KB + 1

            text.postLoad();

            return getPromise.then(() => {
                expect(text.finishLoading).to.be.calledWith(`${someText}...`, false);
            });
        });

        it('should call initHighlightJs if file has code extension', () => {
            const someText = 'blah';
            const getPromise = Promise.resolve(someText);
            sandbox.stub(util, 'get').returns(getPromise);
            sandbox.stub(text, 'initHighlightJs');
            text.options.file.size = 196608 + 1; // 192KB + 1
            text.options.file.extension = 'js'; // code extension

            text.postLoad();

            return getPromise.then(() => {
                expect(text.initHighlightJs).to.be.calledWith(`${someText}...`);
            });
        });
    });

    describe('initHighlightJs()', () => {
        const postMessageFunc = Worker.prototype.postMessage;

        afterEach(() => {
            Object.defineProperty(Worker.prototype, 'postMessage', { value: postMessageFunc });
        });

        it('should create worker and set it up with hljs and pass in the text to convert', () => {
            const hljs = 'hljs';
            const assetUrlCreatorStub = sandbox.stub().returns(hljs);
            sandbox.stub(util, 'createAssetUrlCreator').returns(assetUrlCreatorStub);

            const someText = 'text';
            Object.defineProperty(Worker.prototype, 'postMessage', {
                value: sandbox.mock().withArgs({
                    highlightSrc: hljs,
                    text: someText
                })
            });

            text.initHighlightJs(someText);

            expect(util.createAssetUrlCreator).to.be.called;
            expect(assetUrlCreatorStub).to.be.called;
        });
    });

    describe('initPrint()', () => {
        beforeEach(() => {
            text = new PlainTextViewer({
                file: {
                    id: 0
                },
                container: containerEl
            });
            Object.defineProperty(BaseViewer.prototype, 'setup', { value: sandbox.stub() });
            text.containerEl = containerEl;
            text.setup();
        });

        it('should initialize print popup', () => {
            text.initPrint();
            expect(text.printPopup instanceof Popup).to.be.true;
        });

        it('should set up print checkmark and loading indicator', () => {
            text.initPrint();
            expect(text.printPopup.loadingIndicator instanceof HTMLElement);
            expect(text.printPopup.loadingIndicator.classList.contains('bp-crawler'));
            expect(text.printPopup.printCheckmark instanceof HTMLElement);
            expect(text.printPopup.printCheckmark.classList.contains('bp-print-check'));
        });
    });

    describe('preparePrint()', () => {
        let clock;

        beforeEach(() => {
            clock = sandbox.useFakeTimers();
        });

        afterEach(() => {
            clock.restore();
        });

        it('should setup the print iframe', () => {
            sandbox.stub(util, 'createAssetUrlCreator').returns(sandbox.stub());
            sandbox.stub(util, 'openContentInsideIframe').returns({
                contentDocument: {
                    head: {
                        appendChild: sandbox.stub()
                    }
                }
            });
            text.options.location = 'en-US';

            text.preparePrint(['blah']);

            expect(util.createAssetUrlCreator).to.be.calledWith(text.options.location);
            expect(util.openContentInsideIframe).to.be.calledWith(text.textEl.outerHTML);
            expect(text.printframe.contentDocument.head.appendChild).to.be.called.once;
        });

        it('should enable printing via print popup after a delay', () => {
            sandbox.stub(util, 'createAssetUrlCreator').returns(sandbox.stub());
            sandbox.stub(util, 'createStylesheet');
            sandbox.stub(util, 'openContentInsideIframe').returns({
                contentDocument: {
                    head: {
                        appendChild: sandbox.stub()
                    }
                }
            });

            text.initPrint();
            sandbox.stub(text.printPopup, 'enableButton');

            text.preparePrint(['blah']);
            clock.tick(5001);

            expect(text.printPopup.enableButton).to.be.called;
            expect(text.printPopup.messageEl.textContent).to.equal('Ready to print.');
            expect(text.printPopup.loadingIndicator.classList.contains('bp-is-hidden')).to.be.true;
            expect(text.printPopup.printCheckmark.classList.contains('bp-is-hidden')).to.be.false;
            expect(text.printReady).to.be.true;
        });
    });

    describe('printIframe()', () => {
        it('should focus on content window and print', () => {
            text.printframe = {
                contentWindow: {
                    focus: sandbox.stub(),
                    print: sandbox.stub()
                }
            };
            sandbox.stub(Browser, 'getName').returns('NotExplorer');

            text.printIframe();

            expect(text.printframe.contentWindow.focus).to.be.called;
            expect(text.printframe.contentWindow.focus).to.be.called;
        });
    });

    describe('finishLoading()', () => {
        it('should set code with innerHTML if highlighted', () => {
            const content = '<div>test</div>';
            text.finishLoading(content, true);
            expect(text.codeEl.innerHTML).to.equal(content);
        });

        it('should set code with textContent if not highlighted', () => {
            const content = '<div>test</div>';
            text.finishLoading(content, false);
            expect(text.codeEl.textContent).to.equal(content);
        });

        it('should finish loading, show the text, and emit load', () => {
            sandbox.stub(text, 'loadUI');
            sandbox.stub(text, 'emit');

            text.finishLoading('', true);

            expect(text.loadUI).to.be.called;
            expect(text.emit).to.be.calledWith(VIEWER_EVENT.load);
            expect(text.loaded).to.be.true;
            expect(text.textEl.classList.contains('bp-is-hidden')).to.be.false;
        });

        it('should cleanup worker and show truncated download button if needed', () => {
            text.workerSrc = 'blah';
            text.truncated = true;
            sandbox.stub(text, 'showTruncatedDownloadButton');
            sandbox.stub(URL, 'revokeObjectURL');

            text.finishLoading('', true);

            expect(text.showTruncatedDownloadButton).to.be.called;
            expect(URL.revokeObjectURL).to.be.calledWith(text.workerSrc);
        });
    });

    describe('showTruncatedDownloadButton()', () => {
        it('should set up download button and bind click handler', () => {
            const bindDownload = sandbox.stub();
            text.download = {
                bind: sandbox.stub().returns(bindDownload)
            };

            text.showTruncatedDownloadButton();

            expect(text.textEl.querySelector('.bp-text-truncated')).to.not.be.null;
            const downloadBtnEl = text.textEl.querySelector('.bp-btn-download');
            expect(downloadBtnEl).to.not.be.null;

            downloadBtnEl.click();
            expect(bindDownload).to.be.called;
        });
    });

    describe('download()', () => {
        it('should emit download', () => {
            sandbox.stub(text, 'emit');
            text.download();
            expect(text.emit).to.be.calledWith(VIEWER_EVENT.download);
        });
    });
});
