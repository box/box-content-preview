/* eslint-disable no-unused-expressions */
import PreviewErrorViewer from '../PreviewErrorViewer';
import BaseViewer from '../../BaseViewer';
import Browser from '../../../Browser';
import PreviewError from '../../../PreviewError';
import * as file from '../../../file';
import * as icons from '../../../icons/icons';
import { VIEWER_EVENT } from '../../../events';

let error;
let containerEl;

describe('lib/viewers/error/PreviewErrorViewer', () => {
    const setupFunc = BaseViewer.prototype.setup;

    beforeEach(() => {
        fixture.load('viewers/error/__tests__/PreviewErrorViewer-test.html');
        containerEl = document.querySelector('.container');
        error = new PreviewErrorViewer({
            file: {
                id: '1',
            },
            container: containerEl,
        });
        Object.defineProperty(BaseViewer.prototype, 'setup', { value: jest.fn() });
        error.containerEl = containerEl;
        error.setup();
    });

    afterEach(() => {
        fixture.cleanup();

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: setupFunc });

        if (error && typeof error.destroy === 'function') {
            error.destroy();
        }
        error = null;
    });

    describe('setup()', () => {
        test('should set appropriate properties', () => {
            expect(error.infoEl.classList.contains('bp-error')).toBe(true);
            expect(error.iconEl instanceof HTMLElement).toBe(true);
            expect(error.iconEl.parentNode).toBe(error.infoEl);
            expect(error.messageEl instanceof HTMLElement).toBe(true);
            expect(error.messageEl.parentNode).toBe(error.infoEl);
        });
    });

    describe('load()', () => {
        [
            ['zip', true],
            ['tgz', true],
            ['flv', true],
            ['blah', false],
        ].forEach(testCase => {
            test('should set appropriate icon', () => {
                const getIconFromExtensionStub = jest.spyOn(icons, 'getIconFromExtension');
                const getIconFromNameStub = jest.spyOn(icons, 'getIconFromName');
                const extension = testCase[0];
                const hasCustomIcon = testCase[1];

                const err = new PreviewError('some_code');
                error.options.file.extension = extension;
                error.load(err);

                expect(getIconFromNameStub).toBeCalled();
                if (hasCustomIcon) {
                    expect(getIconFromExtensionStub).toBeCalledWith(extension);
                }
            });
        });

        test('should add link button if error has linkText and linkUrl defined', () => {
            jest.spyOn(error, 'addLinkButton');
            jest.spyOn(error, 'addDownloadButton');

            const err = new PreviewError('some_error_code', '', {
                linkText: 'test',
                linkUrl: 'someUrl',
            });

            error.load(err);

            expect(error.addLinkButton).toBeCalledWith('test', 'someUrl');
            expect(error.addDownloadButton).not.toBeCalled();
        });

        test('should add download button if file can be downloaded', () => {
            jest.spyOn(error, 'addDownloadButton');
            jest.spyOn(file, 'canDownload').mockReturnValue(true);

            error.load('reason');

            expect(error.addDownloadButton).toBeCalled();
        });

        test("should not add download button if file can't be downloaded", () => {
            jest.spyOn(error, 'addDownloadButton');
            jest.spyOn(file, 'canDownload').mockReturnValue(false);

            error.load('reason');

            expect(error.addDownloadButton).not.toBeCalled();
        });

        test('should set the display message', () => {
            const err = new PreviewError('some_error_code', 'error!');
            error.load(err);
            expect(error.messageEl.textContent).toBe('error!');
        });

        test('should not add download button if the browser cannot download', () => {
            jest.spyOn(error, 'addDownloadButton');
            jest.spyOn(Browser, 'canDownload').mockReturnValue(false);

            error.load('reason');

            expect(error.addDownloadButton).not.toBeCalled();
        });

        test('should broadcast the log message', () => {
            jest.spyOn(error, 'emit');
            const err = new PreviewError('some_code', 'reason', {}, 'this is bad');

            error.load(err);

            expect(error.emit).toBeCalledWith(VIEWER_EVENT.load, {
                error: 'this is bad',
            });
        });

        test('should broadcast the display message if there is no error message', () => {
            jest.spyOn(error, 'emit');
            const err = new PreviewError('some_code', 'display message!');

            error.load(err);

            expect(error.emit).toBeCalledWith(VIEWER_EVENT.load, {
                error: 'display message!',
            });
        });

        test('should filter out access tokens before broadcasting', () => {
            jest.spyOn(error, 'emit');
            const err = new PreviewError(
                'some_code',
                'display',
                {},
                'Unexpected server response (0) while retrieving PDF "www.box.com?access_token=blah&test=okay"',
            );

            error.load(err);

            expect(error.emit).toBeCalledWith(VIEWER_EVENT.load, {
                error:
                    'Unexpected server response (0) while retrieving PDF "www.box.com?access_token=[FILTERED]&test=okay"',
            });
        });
    });

    describe('addLinkButton()', () => {
        test('should add a link button with the appropriate message and URL', () => {
            error.addLinkButton('test', 'someUrl');
            const linkBtnEl = error.infoEl.querySelector('a');

            expect(linkBtnEl instanceof HTMLElement).toBe(true);
            expect(linkBtnEl.target).toBe('_blank');
            expect(linkBtnEl.textContent).toBe('test');
            expect(linkBtnEl.href).toContain('someUrl');
        });
    });

    describe('addDownloadButton()', () => {
        test('should add a download button and attach a download click handler', () => {
            jest.spyOn(error, 'download');

            error.addDownloadButton();

            expect(error.downloadBtnEl instanceof HTMLElement).toBe(true);
            expect(error.downloadBtnEl.parentNode).toBe(error.infoEl);
            expect(error.downloadBtnEl.classList.contains('bp-btn')).toBe(true);
            expect(error.downloadBtnEl.classList.contains('bp-btn-primary')).toBe(true);
            expect(error.downloadBtnEl.textContent).toBe('Download');

            error.downloadBtnEl.dispatchEvent(new Event('click'));
            expect(error.download).toBeCalled();
        });
    });

    describe('download()', () => {
        test('should emit download', () => {
            jest.spyOn(error, 'emit');
            error.download();
            expect(error.emit).toBeCalledWith(VIEWER_EVENT.download);
        });
    });

    describe('destroy()', () => {
        test('should remove download button click handler', () => {
            jest.spyOn(error, 'download');

            error.addDownloadButton();
            error.destroy();

            error.downloadBtnEl.dispatchEvent(new Event('click'));
            expect(error.download).not.toBeCalled();
        });
    });
});
