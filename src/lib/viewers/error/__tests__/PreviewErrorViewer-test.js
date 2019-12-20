/* eslint-disable no-unused-expressions */
import PreviewErrorViewer from '../PreviewErrorViewer';
import BaseViewer from '../../BaseViewer';
import Browser from '../../../Browser';
import PreviewError from '../../../PreviewError';
import * as file from '../../../file';
import * as icons from '../../../icons/icons';
import { VIEWER_EVENT } from '../../../events';

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
                id: '1',
            },
            container: containerEl,
        });
        Object.defineProperty(BaseViewer.prototype, 'setup', { value: sandbox.mock() });
        error.containerEl = containerEl;
        error.setup();
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
            ['blah', false],
        ].forEach(testCase => {
            it('should set appropriate icon', () => {
                const getIconFromExtensionStub = sandbox.stub(icons, 'getIconFromExtension');
                const getIconFromNameStub = sandbox.stub(icons, 'getIconFromName');
                const extension = testCase[0];
                const hasCustomIcon = testCase[1];

                const err = new PreviewError('some_code');
                error.options.file.extension = extension;
                error.load(err);

                expect(getIconFromNameStub).to.be.called;
                if (hasCustomIcon) {
                    expect(getIconFromExtensionStub).to.be.calledWith(extension);
                }
            });
        });

        it('should add link button if error has linkText and linkUrl defined', () => {
            sandbox.stub(error, 'addLinkButton');
            sandbox.stub(error, 'addDownloadButton');

            const err = new PreviewError('some_error_code', '', {
                linkText: 'test',
                linkUrl: 'someUrl',
            });

            error.load(err);

            expect(error.addLinkButton).to.be.calledWith('test', 'someUrl');
            expect(error.addDownloadButton).to.not.be.called;
        });

        it('should add download button if file can be downloaded', () => {
            sandbox.stub(error, 'addDownloadButton');
            sandbox.stub(file, 'canDownload').returns(true);

            error.load('reason');

            expect(error.addDownloadButton).to.be.called;
        });

        it("should not add download button if file can't be downloaded", () => {
            sandbox.stub(error, 'addDownloadButton');
            sandbox.stub(file, 'canDownload').returns(false);

            error.load('reason');

            expect(error.addDownloadButton).to.not.be.called;
        });

        it('should set the display message', () => {
            const err = new PreviewError('some_error_code', 'error!');
            error.load(err);
            expect(error.messageEl.textContent).to.equal('error!');
        });

        it('should not add download button if the browser cannot download', () => {
            sandbox.stub(error, 'addDownloadButton');
            sandbox.stub(Browser, 'canDownload').returns(false);

            error.load('reason');

            expect(error.addDownloadButton).to.not.be.called;
        });

        it('should broadcast the log message', () => {
            sandbox.stub(error, 'emit');
            const err = new PreviewError('some_code', 'reason', {}, 'this is bad');

            error.load(err);

            expect(error.emit).to.be.calledWith(VIEWER_EVENT.load, {
                error: 'this is bad',
            });
        });

        it('should broadcast the display message if there is no error message', () => {
            sandbox.stub(error, 'emit');
            const err = new PreviewError('some_code', 'display message!');

            error.load(err);

            expect(error.emit).to.be.calledWith(VIEWER_EVENT.load, {
                error: 'display message!',
            });
        });

        it('should filter out access tokens before broadcasting', () => {
            sandbox.stub(error, 'emit');
            const err = new PreviewError(
                'some_code',
                'display',
                {},
                'Unexpected server response (0) while retrieving PDF "www.box.com?access_token=blah&test=okay"',
            );

            error.load(err);

            expect(error.emit).to.be.calledWith(VIEWER_EVENT.load, {
                error:
                    'Unexpected server response (0) while retrieving PDF "www.box.com?access_token=[FILTERED]&test=okay"',
            });
        });
    });

    describe('addLinkButton()', () => {
        it('should add a link button with the appropriate message and URL', () => {
            error.addLinkButton('test', 'someUrl');
            const linkBtnEl = error.infoEl.querySelector('a');

            expect(linkBtnEl instanceof HTMLElement).to.be.true;
            expect(linkBtnEl.target).to.equal('_blank');
            expect(linkBtnEl.textContent).to.equal('test');
            expect(linkBtnEl.href).to.have.string('someUrl');
        });
    });

    describe('addDownloadButton()', () => {
        it('should add a download button and attach a download click handler', () => {
            sandbox.stub(error, 'download');

            error.addDownloadButton();

            expect(error.downloadBtnEl instanceof HTMLElement).to.be.true;
            expect(error.downloadBtnEl.parentNode).to.equal(error.infoEl);
            expect(error.downloadBtnEl.classList.contains('bp-btn')).to.be.true;
            expect(error.downloadBtnEl.classList.contains('bp-btn-primary')).to.be.true;
            expect(error.downloadBtnEl.textContent).to.equal('Download');

            error.downloadBtnEl.dispatchEvent(new Event('click'));
            expect(error.download).to.be.called;
        });
    });

    describe('download()', () => {
        it('should emit download', () => {
            sandbox.stub(error, 'emit');
            error.download();
            expect(error.emit).to.be.calledWith(VIEWER_EVENT.download);
        });
    });

    describe('destroy()', () => {
        it('should remove download button click handler', () => {
            sandbox.stub(error, 'download');

            error.addDownloadButton();
            error.destroy();

            error.downloadBtnEl.dispatchEvent(new Event('click'));
            expect(error.download).to.not.be.called;
        });
    });
});
