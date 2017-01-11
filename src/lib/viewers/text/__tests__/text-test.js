/* eslint-disable no-unused-expressions */
import Browser from '../../../browser';
import PlainText from '../text';
import Popup from '../../../popup';
import TextBase from '../text-base';
import * as util from '../../../util';

let containerEl;
let text;
const sandbox = sinon.sandbox.create();

describe('text', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/text/__tests__/text-test.html');
        containerEl = document.querySelector('.container');
    });

    afterEach(() => {
        sandbox.verifyAndRestore();

        if (typeof text.destroy === 'function') {
            text.destroy();
        }

        text = null;
    });

    describe('PlainText()', () => {
        const initPrintFunc = PlainText.prototype.initPrint;

        it('should set up proper text elements and initialize print', () => {
            Object.defineProperty(PlainText.prototype, 'initPrint', {
                value: sandbox.stub()
            });

            text = new PlainText(containerEl, {
                file: {
                    id: 0
                }
            });

            expect(text.textEl.className).to.equal('bp-text bp-text-plain hljs bp-is-hidden');
            expect(text.codeEl.parentNode === text.textEl).to.be.true;
            expect(text.truncated).to.be.false;
            expect(PlainText.prototype.initPrint).to.have.been.called;

            // Restore
            Object.defineProperty(PlainText.prototype, 'initPrint', {
                value: initPrintFunc
            });
        });
    });

    describe('destroy()', () => {
        it('should remove the download event listener if it exists', () => {
            text = new PlainText(containerEl, {
                file: {
                    id: 0
                }
            });
            const downloadBtnEl = text.textEl.appendChild(document.createElement('div'));
            downloadBtnEl.classList.add('bp-btn-download');
            sandbox.stub(downloadBtnEl, 'removeEventListener');

            text.destroy();

            expect(downloadBtnEl.removeEventListener).to.have.been.calledWith('click', sinon.match.func);
        });

        it('should call super.destroy()', () => {
            const destroyFunc = Object.getPrototypeOf(PlainText.prototype).destroy;
            Object.defineProperty(Object.getPrototypeOf(PlainText.prototype), 'destroy', {
                value: sandbox.stub()
            });

            text = new PlainText(containerEl, {
                file: {
                    id: 0
                }
            });

            text.destroy();

            expect(TextBase.prototype.destroy).to.have.been.called;

            // Restore
            Object.defineProperty(Object.getPrototypeOf(PlainText.prototype), 'destroy', {
                value: destroyFunc
            });
        });
    });

    describe('load()', () => {
        beforeEach(() => {
            text = new PlainText(containerEl, {
                file: {
                    id: 0,
                    permissions: {
                        can_download: true
                    }
                }
            });
        });

        it('should fetch text representation with access token in query param if file is small enough', () => {
            const getPromise = Promise.resolve('');
            sandbox.stub(util, 'get').returns(getPromise);
            text.options.file.size = 196608 - 1; // 192KB - 1
            const urlWithAccessToken = 'blah';
            sandbox.stub(text, 'appendAuthParam').returns(urlWithAccessToken);

            text.load('');

            return getPromise.then(() => {
                expect(text.truncated).to.be.false;
                expect(util.get).to.have.been.calledWith(urlWithAccessToken, 'text');
            });
        });

        it('should fetch text representation with a byte range if file size is too large', () => {
            const getPromise = Promise.resolve('');
            sandbox.stub(util, 'get').returns(getPromise);
            text.options.file.size = 196608 + 1; // 192KB + 1
            const url = 'url';
            const headersWithRange = {
                Range: 'blah'
            };
            sandbox.stub(text, 'appendAuthHeader').returns(headersWithRange);

            text.load(url);

            return getPromise.then(() => {
                expect(text.truncated).to.be.true;
                expect(util.get).to.have.been.calledWith(url, headersWithRange, 'text');
            });
        });

        it('should append dots to text if truncated', () => {
            const someText = 'blah';
            const getPromise = Promise.resolve(someText);
            sandbox.stub(util, 'get').returns(getPromise);
            sandbox.stub(text, 'finishLoading');
            text.truncated = true;

            text.load('');

            return getPromise.then(() => {
                expect(text.finishLoading).to.have.been.calledWith(`${someText}...`, false);
            });
        });

        it('should call initHighlightJs if file has code extension', () => {
            const someText = 'blah';
            const getPromise = Promise.resolve(someText);
            sandbox.stub(util, 'get').returns(getPromise);
            sandbox.stub(text, 'initHighlightJs');
            text.truncated = true;
            text.options.file.extension = 'js'; // code extension

            text.load('');

            return getPromise.then(() => {
                expect(text.initHighlightJs).to.have.been.calledWith(`${someText}...`);
            });
        });
    });

    describe('print()', () => {
        beforeEach(() => {
            text = new PlainText(containerEl, {
                file: {
                    id: 0
                }
            });
        });

        it('should print iframe if print is ready', () => {
            sandbox.stub(text, 'printIframe');
            text.printReady = true;

            text.print();
            expect(text.printIframe).to.have.been.called;
        });

        it('should prepare printing and show print popup if print is not ready', () => {
            sandbox.stub(text, 'preparePrint');
            text.printReady = false;
            text.printPopup = {
                show: sandbox.stub(),
                disableButton: sandbox.stub()
            };

            text.print();

            expect(text.preparePrint).to.have.been.calledWith('third-party/text/github.css', 'text.css');
            expect(text.printPopup.show).to.have.been.called;
            expect(text.printPopup.disableButton).to.have.been.called;
        });
    });

    describe('initHighlightJs()', () => {
        beforeEach(() => {
            text = new PlainText(containerEl, {
                file: {
                    id: 0
                }
            });
        });

        it('should create worker and set it up with hljs and pass in the text to convert', () => {
            const hljs = 'hljs';
            const assetUrlCreatorStub = sandbox.stub().returns(hljs);
            sandbox.stub(util, 'createAssetUrlCreator').returns(assetUrlCreatorStub);

            const postMessageFunc = Worker.prototype.postMessage;
            Object.defineProperty(Worker.prototype, 'postMessage', {
                value: sandbox.stub()
            });

            const someText = 'text';
            text.initHighlightJs(someText);

            expect(util.createAssetUrlCreator).to.have.been.called;
            expect(assetUrlCreatorStub).to.have.been.called;
            expect(Worker.prototype.postMessage).to.have.been.calledWith({
                highlightSrc: hljs,
                text: someText
            });

            // Restore
            Object.defineProperty(Worker.prototype, 'postMessage', {
                value: postMessageFunc
            });
        });
    });

    describe('initPrint()', () => {
        beforeEach(() => {
            text = new PlainText(containerEl, {
                file: {
                    id: 0
                }
            });
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
            text = new PlainText(containerEl, {
                file: {
                    id: 0
                }
            });
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

            text.preparePrint('blah');

            expect(util.createAssetUrlCreator).to.have.been.calledWith(text.options.location);
            expect(util.openContentInsideIframe).to.have.been.calledWith(text.textEl.outerHTML);
            expect(text.printframe.contentDocument.head.appendChild).to.have.been.called.once;
        });

        it('should enable printing via print popup after a delay', (done) => {
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

            text.preparePrint();
            clock.tick(5001);
            done();

            expect(text.printPopup.enableButton).to.have.been.called;
            expect(text.printPopup.messageEl.textContent).to.equal('Ready to print.');
            expect(text.printPopup.loadingIndicator.classList.contains('bp-is-hidden')).to.be.true;
            expect(text.printPopup.printCheckmark.classList.contains('bp-is-hidden')).to.be.false;
            expect(text.printReady.to.be.true);
        });
    });

    describe('printIframe()', () => {
        beforeEach(() => {
            text = new PlainText(containerEl, {
                file: {
                    id: 0
                }
            });
        });

        it('should focus on content window and print', () => {
            text.printframe = {
                contentWindow: {
                    focus: sandbox.stub(),
                    print: sandbox.stub()
                }
            };
            sandbox.stub(Browser, 'getName').returns('NotExplorer');

            text.printIframe();

            expect(text.printframe.contentWindow.focus).to.have.been.called;
            expect(text.printframe.contentWindow.focus).to.have.been.called;
        });
    });

    describe('finishLoading()', () => {
        beforeEach(() => {
            text = new PlainText(containerEl, {
                file: {
                    id: 0
                }
            });
        });

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

            expect(text.loadUI).to.have.been.called;
            expect(text.emit).to.have.been.calledWith('load');
            expect(text.loaded).to.be.true;
            expect(text.textEl.classList.contains('bp-is-hidden')).to.be.false;
        });

        it('should cleanup worker and show truncated download button if needed', () => {
            text.workerSrc = 'blah';
            text.truncated = true;
            sandbox.stub(text, 'showTruncatedDownloadButton');
            sandbox.stub(URL, 'revokeObjectURL');

            text.finishLoading('', true);

            expect(text.showTruncatedDownloadButton).to.have.been.called;
            expect(URL.revokeObjectURL).to.have.been.calledWith(text.workerSrc);
        });
    });

    describe('showTruncatedDownloadButton()', () => {
        beforeEach(() => {
            text = new PlainText(containerEl, {
                file: {
                    id: 0
                }
            });
        });

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
            expect(bindDownload).to.have.been.called;
        });
    });

    describe('download()', () => {
        it('should emit download', () => {
            text = new PlainText(containerEl, {
                file: {
                    id: 0
                }
            });
            sandbox.stub(text, 'emit');

            text.download();

            expect(text.emit).to.have.been.calledWith('download');
        });
    });
});
