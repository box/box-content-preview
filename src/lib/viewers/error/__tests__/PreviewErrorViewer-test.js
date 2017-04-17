/* eslint-disable no-unused-expressions */
import PreviewErrorViewer from '../PreviewErrorViewer';
import Browser from '../../../Browser';
import * as file from '../../../file';
import { PERMISSION_DOWNLOAD } from '../../../constants';
import {
    ICON_FILE_DEFAULT,
    ICON_FILE_ZIP,
    ICON_FILE_MEDIA
} from '../../../icons/icons';

const sandbox = sinon.sandbox.create();
let error;

describe('lib/viewers/error/PreviewErrorViewer', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/error/__tests__/PreviewErrorViewer-test.html');
        error = new PreviewErrorViewer({
            file: {
                id: '1'
            },
            container: '.container'
        });
    });

    afterEach(() => {
        fixture.cleanup();
        sandbox.verifyAndRestore();

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
            ['zip', ICON_FILE_ZIP],
            ['tgz', ICON_FILE_ZIP],
            ['flv', ICON_FILE_MEDIA],
            ['blah', ICON_FILE_DEFAULT]
        ].forEach((testCase) => {
            it('should set appropriate icon', () => {
                const extension = testCase[0];
                const expectedIcon = testCase[1];

                const message = 'reason';
                error.options.file.extension = extension;
                error.load(message);

                expect(error.iconEl).to.contain.html(expectedIcon);
                expect(error.messageEl.textContent).to.equal(message);
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

        it('should not add download button if the browser cannot download', () => {
            sandbox.stub(error, 'addDownloadButton');
            sandbox.stub(Browser, 'canDownload').returns(false);

            error.load('reason');

            expect(error.addDownloadButton).to.not.be.called;
        });

        it('should broadcast load', () => {
            sandbox.stub(error, 'emit');

            const message = 'reason';
            error.load(message);

            expect(error.emit).to.be.calledWith('load', sinon.match({
                error: message
            }));
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
