/* eslint-disable no-unused-expressions */
import Api from '../../../api';
import BaseViewer from '../../BaseViewer';
import Browser from '../../../Browser';
import Location from '../../../Location';
import OfficeViewer from '../OfficeViewer';
import { CLASS_HIDDEN, SELECTOR_BOX_PREVIEW } from '../../../constants';
import { ICON_PRINT_CHECKMARK } from '../../../icons';

const PRINT_TIMEOUT_MS = 1000; // Wait 1s before trying to print
const PRINT_DIALOG_TIMEOUT_MS = 500;
const OFFICE_ONLINE_IFRAME_NAME = 'office-online-iframe';
const EXCEL_ONLINE_URL = 'https://excel.officeapps.live.com/x/_layouts/xlembed.aspx';

let api;
let office;
let stubs = {};
let containerEl;
let rootEl;

describe('lib/viewers/office/OfficeViewer', () => {
    const setupFunc = BaseViewer.prototype.setup;

    beforeEach(() => {
        jest.useFakeTimers();
        fixture.load('viewers/office/__tests__/OfficeViewer-test.html');
        containerEl = document.querySelector('.container');
        rootEl = document.querySelector(SELECTOR_BOX_PREVIEW);
        api = new Api();
        office = new OfficeViewer({
            api,
            container: containerEl,
            file: {
                id: '123',
            },
            viewers: {
                Office: {
                    shouldUsePlatformSetup: false,
                },
            },
            location: {
                locale: 'en-US',
            },
            appHost: 'https://app.box.com',
            apiHost: 'https://app.box.com',
            token: 'token',
        });
        stubs = {};
        Object.defineProperty(window, 'open', { value: jest.fn() });
        Object.defineProperty(BaseViewer.prototype, 'setup', { value: jest.fn() });
        office.containerEl = containerEl;
        office.rootEl = rootEl;
    });

    afterEach(() => {
        jest.clearAllTimers();
        fixture.cleanup();

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: setupFunc });

        if (office && typeof office.destroy === 'function') {
            office.destroy();
        }

        stubs = null;
        office = null;
    });

    describe('setup()', () => {
        beforeEach(() => {
            stubs.initPrint = jest.spyOn(office, 'initPrint').mockImplementation();
            stubs.setupIframe = jest.spyOn(office, 'setupIframe').mockImplementation();
            stubs.setupPDFUrl = jest.spyOn(office, 'setupPDFUrl').mockImplementation();
        });

        test('should set up the Office viewer', () => {
            office.setup();
            expect(stubs.setupIframe).toBeCalled();
            expect(stubs.setupPDFUrl).toBeCalled();
            expect(stubs.initPrint).toBeCalled();
        });

        test('should not use platform setup', () => {
            office.setup();
            expect(office.platformSetup).toBe(false);
        });
    });

    describe('destroy()', () => {
        test('should clear the print blob', () => {
            office.printBlob = {};
            office.destroy();
            expect(office.printBlob).toBeNull();
        });

        test('should revoke the printURL object', () => {
            jest.spyOn(URL, 'revokeObjectURL').mockImplementation();
            office.printURL = 'someblob';
            office.destroy();
            expect(URL.revokeObjectURL).toBeCalledWith(office.printURL);
        });
    });

    describe('load()', () => {
        const loadFunc = BaseViewer.prototype.load;

        afterEach(() => {
            Object.defineProperty(BaseViewer.prototype, 'load', { value: loadFunc });
        });

        test('should not call setup and load the Office viewer', () => {
            const setupStub = jest.spyOn(office, 'setup');
            Object.defineProperty(BaseViewer.prototype, 'load', { value: jest.fn() });

            office.load();

            expect(setupStub).not.toBeCalled();
            expect(BaseViewer.prototype.load).toBeCalled();
        });

        test('should invoke startLoadTimer()', () => {
            jest.spyOn(office, 'startLoadTimer');

            office.load();
            expect(office.startLoadTimer).toBeCalled();
        });
    });

    describe('setupIframe()', () => {
        beforeEach(() => {
            stubs.createIframeElement = jest.spyOn(office, 'createIframeElement');
            stubs.form = {
                submit: jest.fn(),
            };

            stubs.createFormElement = jest.spyOn(office, 'createFormElement').mockReturnValue(stubs.form);
            stubs.setupRunmodeURL = jest.spyOn(office, 'setupRunmodeURL').mockReturnValue('src');
        });

        test('should create the iframeEl', () => {
            office.setupIframe();

            expect(stubs.createIframeElement).toBeCalled();
        });

        test('should finish setting up the iframe if using platform setup', () => {
            office.platformSetup = true;
            office.setupIframe();

            const iframeEl = office.containerEl.querySelector(`#${OFFICE_ONLINE_IFRAME_NAME}`);
            expect(iframeEl.name).toBe(OFFICE_ONLINE_IFRAME_NAME);
            expect(iframeEl.id).toBe(OFFICE_ONLINE_IFRAME_NAME);
        });

        test('should setup and submit the form if using the platform setup', () => {
            office.platformSetup = true;
            office.setupIframe();

            expect(stubs.createFormElement).toBeCalledWith(
                office.options.appHost,
                office.options.file.id,
                office.options.sharedLink,
                office.options.location.locale,
            );
            expect(stubs.form.submit).toBeCalled();
        });

        test('should set the iframe source and sandbox attribute if not using the platform setup', () => {
            office.setupIframe();

            const iframeEl = office.containerEl.querySelector('iframe');
            expect(iframeEl.src.endsWith('src')).toBe(true);
        });
    });
    describe('setupRunmodeURL()', () => {
        test('should load a xlsx file and set the file ID in src url on load event when the file is not a shared link', () => {
            const src = office.setupRunmodeURL(
                office.options.appHost,
                office.options.file.id,
                office.options.sharedLink,
            );
            expect(src).toBe('https://app.box.com/integrations/officeonline/openExcelOnlinePreviewer?fileId=123');
        });

        test('should load a xlsx file and set the shared name in src url on load event when the file is a shared link', () => {
            office.options.sharedLink = 'https://app.box.com/s/abcd';
            const src = office.setupRunmodeURL(
                office.options.appHost,
                office.options.file.id,
                office.options.sharedLink,
            );
            expect(src).toBe(
                'https://app.box.com/integrations/officeonline/openExcelOnlinePreviewer?s=abcd&fileId=123',
            );
        });

        test('should load a xlsx file and set the vanity name in src url on load event when the file is a vanity url without a subdomain', () => {
            office.options.sharedLink = 'https://app.box.com/v/test';
            const src = office.setupRunmodeURL(
                office.options.appHost,
                office.options.file.id,
                office.options.sharedLink,
            );
            expect(src).toBe(
                'https://app.box.com/integrations/officeonline/openExcelOnlinePreviewer?v=test&vanity_subdomain=app&fileId=123',
            );
        });

        test('should load a xlsx file and set the vanity name in src url on load event when the file is a vanity url with a subdomain', () => {
            office.options.sharedLink = 'https://cloud.app.box.com/v/test';
            const src = office.setupRunmodeURL(
                office.options.appHost,
                office.options.file.id,
                office.options.sharedLink,
            );
            expect(src).toBe(
                'https://cloud.app.box.com/integrations/officeonline/openExcelOnlinePreviewer?v=test&vanity_subdomain=cloud&fileId=123',
            );
        });

        test('should load a xlsx file with a runmode sourced to the original domain if the appHost differs', () => {
            office.options.sharedLink = 'https://app.box.com/v/test';
            office.options.appHost = 'https://cloud.app.box.com';
            let src = office.setupRunmodeURL(office.options.appHost, office.options.file.id, office.options.sharedLink);
            expect(src).toBe(
                'https://app.box.com/integrations/officeonline/openExcelOnlinePreviewer?v=test&vanity_subdomain=app&fileId=123',
            );

            office.options.sharedLink = 'https://ibm.box.com/s/abcd';
            src = office.setupRunmodeURL(office.options.appHost, office.options.file.id, office.options.sharedLink);
            expect(src).toBe(
                'https://ibm.box.com/integrations/officeonline/openExcelOnlinePreviewer?s=abcd&fileId=123',
            );

            office.options.sharedLink = 'https://cloud.box.com/s/abcd';
            office.options.appHost = 'https://app.app.box.com';

            src = office.setupRunmodeURL(office.options.appHost, office.options.file.id, office.options.sharedLink);
            expect(src).toBe(
                'https://cloud.box.com/integrations/officeonline/openExcelOnlinePreviewer?s=abcd&fileId=123',
            );
        });
    });

    describe('setupWOPISrc()', () => {
        test('should append the file ID if there is no shared link', () => {
            const src = office.setupWOPISrc(office.options.apiHost, office.options.file.id, office.options.sharedLink);
            expect(src).toBe('https://app.box.com/wopi/files/123');
        });

        test('should append the shared name and file ID if there is a shared link', () => {
            office.options.sharedLink = 'https://app.box.com/s/abcd';
            const src = office.setupWOPISrc(office.options.apiHost, office.options.file.id, office.options.sharedLink);
            expect(src).toBe('https://app.box.com/wopi/files/s_abcd_f_123');
        });

        test('should not append the shared name if there is a vanity link', () => {
            office.options.sharedLink = 'https://app.box.com/v/abcd';
            const src = office.setupWOPISrc(office.options.apiHost, office.options.file.id, office.options.sharedLink);
            expect(src.includes('s_')).toBe(false);
        });
    });

    describe('createIframeElement()', () => {
        test('should initialize iframe element and set relevant attributes', () => {
            const iframeEl = office.createIframeElement();

            expect(iframeEl.width).toBe('100%');
            expect(iframeEl.height).toBe('100%');
            expect(iframeEl.frameBorder).toBe('0');
            expect(iframeEl.getAttribute('sandbox')).toBe(
                'allow-scripts allow-same-origin allow-forms allow-popups allow-downloads',
            );
        });

        test('should allow fullscreen if using the platform setup', () => {
            office.platformSetup = true;
            const iframeEl = office.createIframeElement();

            expect(iframeEl.getAttribute('allowfullscreen')).toBe('true');
        });
    });

    describe('createFormElement()', () => {
        beforeEach(() => {
            const origin = 'someOrigin';
            jest.spyOn(Location, 'getOrigin').mockReturnValue(origin);
            stubs.setupWOPISrc = jest.spyOn(office, 'setupWOPISrc').mockReturnValue('src');
            stubs.sessionContext = JSON.stringify({ origin });
            stubs.formEl = office.createFormElement(
                office.options.apiHost,
                office.options.file.id,
                office.options.sharedLink,
                office.options.location.locale,
            );
        });

        test('should correctly set the action URL', () => {
            expect(stubs.formEl.getAttribute('action')).toBe(
                `${EXCEL_ONLINE_URL}?ui=${office.options.location.locale}&rs=${office.options.location.locale}&WOPISrc=src&sc=${stubs.sessionContext}`,
            );
            expect(stubs.formEl.getAttribute('method')).toBe('POST');
            expect(stubs.formEl.getAttribute('target')).toBe(OFFICE_ONLINE_IFRAME_NAME);
        });

        test('should correctly set the token', () => {
            const tokenInputEl = stubs.formEl.querySelector('input[name="access_token"]');
            expect(tokenInputEl.getAttribute('name')).toBe('access_token');
            expect(tokenInputEl.getAttribute('value')).toBe('token');
            expect(tokenInputEl.getAttribute('type')).toBe('hidden');
        });

        test('should correctly set the token time to live', () => {
            const tokenInputEl = stubs.formEl.querySelector('input[name="access_token_TTL"]');
            expect(tokenInputEl.getAttribute('name')).toBe('access_token_TTL');
            expect(tokenInputEl.getAttribute('value')).toBeDefined();
            expect(tokenInputEl.getAttribute('type')).toBe('hidden');
        });
    });

    describe('print()', () => {
        beforeEach(() => {
            office.printBlob = undefined;
            stubs.fetchPrintBlob = jest.spyOn(office, 'fetchPrintBlob').mockReturnValue({
                then: jest.fn(),
            });
            office.initPrint();
            stubs.show = jest.spyOn(office.printPopup, 'show');
        });

        test('should request the print blob if it is not ready', () => {
            office.print();
            expect(stubs.fetchPrintBlob).toBeCalled();
        });

        test("should directly print if print blob is ready and the print dialog hasn't been shown yet", () => {
            office.printBlob = {};
            office.printDialogTimeout = setTimeout(() => {});
            jest.spyOn(office, 'browserPrint');

            office.print();
            expect(office.browserPrint).toBeCalled();
        });

        test("should directly print if print blob is ready and the print dialog isn't visible", () => {
            office.printBlob = {};
            office.printDialogTimeout = null;
            jest.spyOn(office.printPopup, 'isVisible').mockReturnValue(false);
            jest.spyOn(office, 'browserPrint');

            office.print();
            expect(office.browserPrint).toBeCalled();
        });

        test('should show the print popup and disable the print button if the blob is not ready', () => {
            jest.spyOn(office.printPopup, 'disableButton');

            office.print();
            jest.advanceTimersByTime(PRINT_DIALOG_TIMEOUT_MS + 1);

            expect(stubs.show).toBeCalledWith(__('print_loading'), __('print'), expect.any(Function));
            expect(office.printPopup.disableButton).toBeCalled();
        });

        test('should update the print popup UI if popup is visible and there is no current print timeout', () => {
            office.printBlob = {};

            jest.spyOn(office.printPopup, 'isVisible').mockReturnValue(true);

            office.print();

            expect(office.printPopup.buttonEl.classList.contains('is-disabled')).toBe(false);
            expect(office.printPopup.messageEl.textContent).toBe(__('print_ready'));
            expect(office.printPopup.loadingIndicator.classList.contains(CLASS_HIDDEN)).toBe(true);
            expect(office.printPopup.printCheckmark.classList.contains(CLASS_HIDDEN)).toBe(false);
        });
    });

    describe('initPrint()', () => {
        test('should add print checkmark', () => {
            office.initPrint();
            const mockCheckmark = document.createElement('div');
            mockCheckmark.innerHTML = `${ICON_PRINT_CHECKMARK}`.trim();
            expect(office.printPopup.printCheckmark.innerHTML).toBe(mockCheckmark.innerHTML);
        });

        test('should hide the print checkmark', () => {
            office.initPrint();
            expect(office.printPopup.printCheckmark.classList.contains(CLASS_HIDDEN));
        });
    });

    describe('browserPrint()', () => {
        beforeEach(() => {
            stubs.emit = jest.spyOn(office, 'emit');
            stubs.createObject = jest.spyOn(URL, 'createObjectURL');
            stubs.open = jest.spyOn(window, 'open').mockReturnValue(false);
            stubs.browser = jest.spyOn(Browser, 'getName').mockReturnValue('Chrome');
            stubs.printResult = {
                print: jest.fn(),
                addEventListener: jest.fn(),
            };
            office.printBlob = true;
            window.navigator.msSaveOrOpenBlob = jest.fn(() => true);
        });

        test('should use the open or save dialog if on IE or Edge', () => {
            office.browserPrint();
            expect(window.navigator.msSaveOrOpenBlob).toBeCalled();
            expect(stubs.emit).toBeCalled();
        });

        test('should use the open or save dialog if on IE or Edge and emit a message', () => {
            office.browserPrint();
            expect(window.navigator.msSaveOrOpenBlob).toBeCalled();
            expect(stubs.emit).toBeCalled();
        });

        test('should emit an error message if the print result fails on IE or Edge', () => {
            window.navigator.msSaveOrOpenBlob.mockReturnValue(false);

            office.browserPrint();
            expect(window.navigator.msSaveOrOpenBlob).toBeCalled();
            expect(stubs.emit).toBeCalledWith('printerror');
        });

        test('should open the pdf in a new tab if not on IE or Edge', () => {
            window.navigator.msSaveOrOpenBlob = undefined;

            office.browserPrint();
            expect(stubs.createObject).toBeCalledWith(office.printBlob);
            expect(stubs.open).toBeCalled();
            expect(stubs.emit).toBeCalled();
        });

        test('should print on load in the chrome browser', () => {
            window.navigator.msSaveOrOpenBlob = undefined;
            stubs.open.mockReturnValue(stubs.printResult);

            office.browserPrint();
            expect(stubs.createObject).toBeCalledWith(office.printBlob);
            expect(stubs.open).toBeCalled();
            expect(stubs.browser).toBeCalled();
            expect(stubs.emit).toBeCalled();
        });

        test('should use a timeout in safari', () => {
            window.navigator.msSaveOrOpenBlob = undefined;
            stubs.open.mockReturnValue(stubs.printResult);
            stubs.browser.mockReturnValue('Safari');

            office.browserPrint();
            jest.advanceTimersByTime(PRINT_TIMEOUT_MS + 1000);

            expect(stubs.createObject).toBeCalledWith(office.printBlob);
            expect(stubs.open).toBeCalled();
            expect(stubs.browser).toBeCalled();
            expect(stubs.printResult.print).toBeCalled();
            expect(stubs.emit).toBeCalled();
        });
    });

    describe('fetchPrintBlob()', () => {
        beforeEach(() => {
            stubs.promise = Promise.resolve({ blob: 'blob' });
            stubs.get = jest.spyOn(api, 'get').mockReturnValue(stubs.promise);
            stubs.appendAuthHeader = jest.spyOn(office, 'appendAuthHeader');
            office.initPrint();
        });

        test('should get and return the blob', () => {
            office.api = api;

            office.fetchPrintBlob('url');

            return stubs.promise.then(blob => {
                expect(stubs.get).toBeCalled();
                expect(blob.blob).toBe('blob');
            });
        });
    });

    describe('setupPDFUrl', () => {
        beforeEach(() => {
            stubs.createContentUrl = jest.spyOn(office, 'createContentUrlWithAuthParams');
        });

        test('should not attempt to set pdfUrl if no pdf rep exist', () => {
            office.options.file.representations = {
                entries: [],
            };

            office.setupPDFUrl();

            expect(office.pdfUrl).toBeUndefined();
            expect(stubs.createContentUrl).not.toBeCalled();
        });

        test('should not attempt to set pdfUrl if no content exists', () => {
            office.options.file.representations = {
                entries: [{ representation: 'pdf' }],
            };

            office.setupPDFUrl();

            expect(office.pdfUrl).toBeUndefined();
            expect(stubs.createContentUrl).not.toBeCalled();
        });

        test('should set pdfUrl if pdf rep exists', () => {
            stubs.createContentUrl.mockReturnValue('url');
            stubs.setupPDFUrl;
            office.options.file.representations = {
                entries: [{ representation: 'pdf', content: { url_template: 'template' } }],
            };

            office.setupPDFUrl();

            expect(office.pdfUrl).toBe('url');
            expect(stubs.createContentUrl).toBeCalled();
        });
    });
});
