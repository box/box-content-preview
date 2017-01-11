/* eslint-disable no-unused-expressions */
import Error from '../error';
import {
    ICON_FILE_DEFAULT,
    ICON_FILE_ZIP,
    ICON_FILE_MEDIA
} from '../../../icons/icons';

const sandbox = sinon.sandbox.create();
let error;

describe('error', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/error/__tests__/error-test.html');
        error = new Error(document.querySelector('.container'), {
            file: {
                id: '1'
            }
        });
    });

    afterEach(() => {
        fixture.cleanup();
        sandbox.verifyAndRestore();
    });

    describe('constructor()', () => {
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
                error.load('someUrl', message);

                expect(error.iconEl).to.contain.html(expectedIcon);
                expect(error.messageEl.textContent).to.equal(message);
            });
        });

        it('should add download button if file has permissions', () => {
            sandbox.stub(error, 'addDownloadButton');

            error.options.file.permissions = {
                can_download: true
            };
            error.load('someUrl', 'reason');

            expect(error.addDownloadButton).to.have.been.called;
        });

        it('should broadcast load', () => {
            sandbox.stub(error, 'emit');

            const message = 'reason';
            error.load('someUrl', message);

            expect(error.emit).to.have.been.calledWith('load', sinon.match({
                error: message
            }));
        });
    });

    describe('addDownloadButton()', () => {
        it('should add a download button and attach a download click handler', () => {
            sandbox.stub(error, 'download');

            error.addDownloadButton();

            expect(error.downloadEl instanceof HTMLElement).to.be.true;
            expect(error.downloadEl.parentNode).to.equal(error.infoEl);
            expect(error.downloadBtnEl instanceof HTMLElement).to.be.true;
            expect(error.downloadBtnEl.classList.contains('bp-btn')).to.be.true;
            expect(error.downloadBtnEl.classList.contains('bp-btn-primary')).to.be.true;
            expect(error.downloadBtnEl.textContent).to.equal('Download');

            error.downloadBtnEl.dispatchEvent(new Event('click'));
            expect(error.download).to.have.been.called;
        });
    });

    describe('download()', () => {
        it('should emit download', () => {
            sandbox.stub(error, 'emit');
            error.download();
            expect(error.emit).to.have.been.calledWith('download');
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
