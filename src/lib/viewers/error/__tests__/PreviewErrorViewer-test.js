/* eslint-disable no-unused-expressions */
import PreviewErrorViewer from '../PreviewErrorViewer';
import BaseViewer from '../../BaseViewer';
import Browser from '../../../Browser';
import * as file from '../../../file';
import { PERMISSION_DOWNLOAD } from '../../../constants';
import * as icons from '../../../icons/icons';

const sandbox = sinon.sandbox.create();
let error;
let containerEl;

describe('lib/viewers/error/PreviewErrorViewer', () => {
    const setupFunc = BaseViewer.prototype.setup;

    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/error/__tests__/PreviewErrorViewer-test.html');
        containerEl = document.querySelector('.container');
        error = new PreviewErrorViewer({
            file: {
                id: '1'
            },
            container: containerEl
        });
        Object.defineProperty(BaseViewer.prototype, 'setup', { value: sandbox.mock() });
        error.containerEl = containerEl;
    });

    afterEach(() => {
        fixture.cleanup();
        sandbox.verifyAndRestore();

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: setupFunc });

        if (error && typeof error.destroy === 'function') {
            error.destroy();
        }
        error = null;
    });

    describe('setup()', () => {
        it('should set appropriate properties', () => {
            error.setup();
            expect(error.infoEl.classList.contains('bp-error')).to.be.true;
            expect(error.iconEl instanceof HTMLElement).to.be.true;
            expect(error.iconEl.parentNode).to.equal(error.infoEl);
            expect(error.messageEl instanceof HTMLElement).to.be.true;
            expect(error.messageEl.parentNode).to.equal(error.infoEl);
        });
    });

    describe('load()', () => {
        [
            ['zip', true],
            ['tgz', true],
            ['flv', true],
            ['blah', false]
        ].forEach((testCase) => {
            it('should set appropriate icon', () => {
                const getIconFromExtensionStub = sandbox.stub(icons, 'getIconFromExtension');
                const getIconFromNameStub = sandbox.stub(icons, 'getIconFromName');
                const extension = testCase[0];
                const hasCustomIcon = testCase[1];

                const err = new Error();
                err.displayMessage = 'reason';
                error.options.file.extension = extension;
                error.load(err);

                expect(getIconFromNameStub).to.be.called;
                if (hasCustomIcon) {
                    expect(getIconFromExtensionStub).to.be.calledWith(extension);
                }
                expect(error.messageEl.textContent).to.equal(err.displayMessage);
            });
        });

        it('should add download button if file has permissions and showDownload option is set', () => {
            sandbox.stub(error, 'addDownloadButton');
            sandbox.stub(file, 'checkPermission').withArgs(error.options.file, PERMISSION_DOWNLOAD).returns(true);
            error.options.showDownload = true;

            error.load('reason');

            expect(error.addDownloadButton).to.be.called;
        });

        it('should not add download button if file does not have download permissions', () => {
            sandbox.stub(error, 'addDownloadButton');
            sandbox.stub(file, 'checkPermission').withArgs(error.options.file, PERMISSION_DOWNLOAD).returns(false);
            error.options.showDownload = true;

            error.load('reason');

            expect(error.addDownloadButton).to.not.be.called;
        });

        it('should not add download button if showDownload option is not set', () => {
            sandbox.stub(error, 'addDownloadButton');
            sandbox.stub(file, 'checkPermission').withArgs(error.options.file, PERMISSION_DOWNLOAD).returns(true);
            error.options.showDownload = false;

            error.load('reason');

            expect(error.addDownloadButton).to.not.be.called;
        });

        it('set the display message to the fallback error if the original display message is not a string', () => {
            const err = new Error();
            err.displayMessage = {
                error: 'error!'
            };

            error.load(err);

            expect(error.messageEl.textContent).to.equal(__('error_default'));
        });

        it('should not add download button if the browser cannot download', () => {
            sandbox.stub(error, 'addDownloadButton');
            sandbox.stub(Browser, 'canDownload').returns(false);

            error.load('reason');

            expect(error.addDownloadButton).to.not.be.called;
        });

        it('should broadcast the log message', () => {
            sandbox.stub(error, 'emit');

            const err = new Error();
            err.displayMessage = 'reason';
            err.message = 'this is bad';

            error.load(err);

            expect(error.emit).to.be.calledWith(
                'load', {
                    error: 'this is bad'
                }
            );
        });

        it('should broadcast the display message if there is no log message', () => {
            sandbox.stub(error, 'emit');

            const err = new Error();
            err.displayMessage = 'reason';
            err.message = undefined;

            error.load(err);


            expect(error.emit).to.be.calledWith(
                'load', {
                    error: 'reason'
                }
            );
        });
    });

    describe('addDownloadButton()', () => {
        it('should add a download button and attach a download click handler', () => {
            error.setup();
            sandbox.stub(error, 'download');

            error.addDownloadButton();

            expect(error.downloadEl instanceof HTMLElement).to.be.true;
            expect(error.downloadEl.parentNode).to.equal(error.infoEl);
            expect(error.downloadBtnEl instanceof HTMLElement).to.be.true;
            expect(error.downloadBtnEl.classList.contains('bp-btn')).to.be.true;
            expect(error.downloadBtnEl.classList.contains('bp-btn-primary')).to.be.true;
            expect(error.downloadBtnEl.textContent).to.equal('Download');

            error.downloadBtnEl.dispatchEvent(new Event('click'));
            expect(error.download).to.be.called;
        });
    });

    describe('download()', () => {
        it('should emit download', () => {
            error.setup();
            sandbox.stub(error, 'emit');
            error.download();
            expect(error.emit).to.be.calledWith('download');
        });
    });

    describe('destroy()', () => {
        it('should remove download button click handler', () => {
            error.setup();
            sandbox.stub(error, 'download');

            error.addDownloadButton();
            error.destroy();

            error.downloadBtnEl.dispatchEvent(new Event('click'));
            expect(error.download).to.not.be.called;
        });
    });
});
