/* eslint-disable no-unused-expressions */
import BaseViewer from '../../BaseViewer';
import Browser from '../../../Browser';
import OfficeViewer from '../OfficeViewer';
import * as util from '../../../util';
import { CLASS_HIDDEN } from '../../../constants';
import { ICON_PRINT_CHECKMARK } from '../../../icons/icons';

const PRINT_TIMEOUT_MS = 1000; // Wait 1s before trying to print
const PRINT_DIALOG_TIMEOUT_MS = 500;
const OFFICE_ONLINE_IFRAME_NAME = 'office-online-iframe';
const EXCEL_ONLINE_URL = 'https://excel.officeapps.live.com/x/_layouts/xlembed.aspx';

const sandbox = sinon.sandbox.create();
let office;
let stubs = {};
let containerEl;

describe('lib/viewers/office/OfficeViewer', () => {
    let clock;
    const setupFunc = BaseViewer.prototype.setup;

    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/office/__tests__/OfficeViewer-test.html');
        containerEl = document.querySelector('.container');
        office = new OfficeViewer({
            container: containerEl,
            file: {
                id: '123'
            },
            viewers: {
                Office: {
                    shouldUsePlatformSetup: false
                }
            },
            location: {
                locale: 'en-US'
            },
            appHost: 'app.box.com',
            apiHost: 'app.box.com',
            token: 'token'
        });
        stubs = {
            setupPDFUrl: sandbox.stub(office, 'setupPDFUrl')
        };
        clock = sinon.useFakeTimers();
        Object.defineProperty(BaseViewer.prototype, 'setup', { value: sandbox.stub() });
        office.containerEl = containerEl;
    });

    afterEach(() => {
        clock.restore();
        sandbox.verifyAndRestore();
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
            stubs.setupIframe = sandbox.stub(office, 'setupIframe');
            stubs.initPrint = sandbox.stub(office, 'initPrint');
        });

        it('should set up the Office viewer', () => {
            office.setup();
            expect(stubs.setupIframe).to.be.called;
            expect(stubs.initPrint).to.be.called;
            expect(stubs.setupPDFUrl).to.be.called;
        });

        it('should not determine setup based on the option if it is passed in', () => {
            office.setup();
            expect(office.platformSetup).to.be.false;

            office.options.viewers.Office.shouldUsePlatformSetup = true;
            office.setup();
            expect(office.platformSetup).to.be.true;
        });

        it('should use the platform setup if no option is passed in', () => {
            office.options.viewers = {};
            office.setup();
            expect(office.platformSetup).to.be.true;
        });

        it('should still use the platform setup if the viewer option, but no setup option exists', () => {
            office.options.viewers = {
                Office: {
                    disabled: false
                }
            };
            office.setup();
            expect(office.platformSetup).to.be.true;
        });
    });

    describe('destroy()', () => {
        it('should clear the print blob', () => {
            office.printBlob = {};
            office.destroy();
            expect(office.printBlob).to.equal(null);
        });
    });

    describe('load()', () => {
        const loadFunc = BaseViewer.prototype.load;

        afterEach(() => {
            Object.defineProperty(BaseViewer.prototype, 'load', { value: loadFunc });
        });

        it('should call setup and load the Office viewer', () => {
            const setupStub = sandbox.stub(office, 'setup');
            Object.defineProperty(BaseViewer.prototype, 'load', { value: sandbox.stub() });

            office.load();

            expect(setupStub).to.be.called;
            expect(BaseViewer.prototype.load).to.be.called;
        });
    });

    describe('setupIframe()', () => {
        beforeEach(() => {
            stubs.createIframeElement = sandbox.spy(office, 'createIframeElement');
            stubs.form = {
                submit: sandbox.stub()
            };

            stubs.createFormElement = sandbox.stub(office, 'createFormElement').returns(stubs.form);
            stubs.setupRunmodeURL = sandbox.stub(office, 'setupRunmodeURL').returns('src');
        });

        it('should create the iframeEl', () => {
            office.setupIframe();

            expect(stubs.createIframeElement).to.be.called;
        });

        it('should finish setting up the iframe if using platform setup', () => {
            office.platformSetup = true;
            office.setupIframe();

            const iframeEl = office.containerEl.querySelector(`#${OFFICE_ONLINE_IFRAME_NAME}`);
            expect(iframeEl.name).to.equal(OFFICE_ONLINE_IFRAME_NAME);
            expect(iframeEl.id).to.equal(OFFICE_ONLINE_IFRAME_NAME);
        });

        it('should setup and submit the form if using the platform setup', () => {
            office.platformSetup = true;
            office.setupIframe();

            expect(stubs.createFormElement).to.be.calledWith(
                office.options.appHost,
                office.options.file.id,
                office.options.sharedLink,
                office.options.location.locale
            );
            expect(stubs.form.submit).to.be.called;
        });

        it('should set the iframe source and sandbox attribute if not using the platform setup', () => {
            office.setupIframe();

            const iframeEl = office.containerEl.querySelector('iframe');
            expect(iframeEl.src.endsWith('src')).to.be.true;
        });
    });
    describe('setupRunmodeURL()', () => {
        it('should load a xlsx file and set the file ID in src url on load event when the file is not a shared link', () => {
            const src = office.setupRunmodeURL(
                office.options.appHost,
                office.options.file.id,
                office.options.sharedLink
            );
            expect(src).to.equal('app.box.com/integrations/officeonline/openExcelOnlinePreviewer?fileId=123');
        });

        it('should load a xlsx file and set the shared name in src url on load event when the file is a shared link', () => {
            office.options.sharedLink = 'https://app.box.com/s/abcd';
            const src = office.setupRunmodeURL(
                office.options.appHost,
                office.options.file.id,
                office.options.sharedLink
            );
            expect(src).to.equal('app.box.com/integrations/officeonline/openExcelOnlinePreviewer?s=abcd&fileId=123');
        });

        it('should load a xlsx file and set the vanity name in src url on load event when the file is a vanity url without a subdomain', () => {
            office.options.sharedLink = 'https://app.box.com/v/test';
            const src = office.setupRunmodeURL(
                office.options.appHost,
                office.options.file.id,
                office.options.sharedLink
            );
            expect(src).to.equal(
                'app.box.com/integrations/officeonline/openExcelOnlinePreviewer?v=test&vanity_subdomain=app&fileId=123'
            );
        });

        it('should load a xlsx file and set the vanity name in src url on load event when the file is a vanity url with a subdomain', () => {
            office.options.sharedLink = 'https://cloud.app.box.com/v/test';
            const src = office.setupRunmodeURL(
                office.options.appHost,
                office.options.file.id,
                office.options.sharedLink
            );
            expect(src).to.equal(
                'app.box.com/integrations/officeonline/openExcelOnlinePreviewer?v=test&vanity_subdomain=cloud&fileId=123'
            );
        });
    });

    describe('setupWOPISrc()', () => {
        it('should append the file ID if there is no shared link', () => {
            const src = office.setupWOPISrc(office.options.apiHost, office.options.file.id, office.options.sharedLink);
            expect(src).to.equal('app.box.com/wopi/files/123');
        });

        it('should append the shared name and file ID if there is a shared link', () => {
            office.options.sharedLink = 'https://app.box.com/s/abcd';
            const src = office.setupWOPISrc(office.options.apiHost, office.options.file.id, office.options.sharedLink);
            expect(src).to.equal('app.box.com/wopi/files/s_abcd_f_123');
        });

        it('should not append the shared name if there is a vanity link', () => {
            office.options.sharedLink = 'https://app.box.com/v/abcd';
            const src = office.setupWOPISrc(office.options.apiHost, office.options.file.id, office.options.sharedLink);
            expect(src.includes('s_')).to.be.false;
        });
    });

    describe('createIframeElement()', () => {
        it('should initialize iframe element and set relevant attributes', () => {
            const iframeEl = office.createIframeElement();

            expect(iframeEl.width).to.equal('100%');
            expect(iframeEl.height).to.equal('100%');
            expect(iframeEl.frameBorder).to.equal('0');
            expect(iframeEl.getAttribute('sandbox')).to.equal(
                'allow-scripts allow-same-origin allow-forms allow-popups'
            );
        });

        it('should allow fullscreen if using the platform setup', () => {
            office.platformSetup = true;
            const iframeEl = office.createIframeElement();

            expect(iframeEl.getAttribute('allowfullscreen')).to.equal('true');
        });
    });

    describe('createFormElement()', () => {
        beforeEach(() => {
            stubs.setupWOPISrc = sandbox.stub(office, 'setupWOPISrc').returns('src');
            stubs.sessionContext = JSON.stringify({ origin: window.location.origin });
            stubs.formEl = office.createFormElement(
                office.options.apiHost,
                office.options.file.id,
                office.options.sharedLink,
                office.options.location.locale
            );
        });

        it('should correctly set the action URL', () => {
            expect(stubs.formEl.getAttribute('action')).to.equal(
                `${EXCEL_ONLINE_URL}?ui=${office.options.location.locale}&rs=${office.options.location.locale}&WOPISrc=src&sc=${stubs.sessionContext}`
            );
            expect(stubs.formEl.getAttribute('method')).to.equal('POST');
            expect(stubs.formEl.getAttribute('target')).to.equal(OFFICE_ONLINE_IFRAME_NAME);
        });

        it('should correctly set the token', () => {
            const tokenInputEl = stubs.formEl.querySelector('input[name="access_token"]');
            expect(tokenInputEl.getAttribute('name')).to.equal('access_token');
            expect(tokenInputEl.getAttribute('value')).to.equal('token');
            expect(tokenInputEl.getAttribute('type')).to.equal('hidden');
        });

        it('should correctly set the token time to live', () => {
            const tokenInputEl = stubs.formEl.querySelector('input[name="access_token_TTL"]');
            expect(tokenInputEl.getAttribute('name')).to.equal('access_token_TTL');
            expect(tokenInputEl.getAttribute('value')).to.not.equal(undefined);
            expect(tokenInputEl.getAttribute('type')).to.equal('hidden');
        });
    });

    describe('print()', () => {
        beforeEach(() => {
            office.printBlob = undefined;
            stubs.fetchPrintBlob = sandbox.stub(office, 'fetchPrintBlob').returns({
                then: sandbox.stub()
            });
            office.initPrint();
            stubs.show = sandbox.stub(office.printPopup, 'show');
        });

        it('should request the print blob if it is not ready', () => {
            office.print();
            expect(stubs.fetchPrintBlob).to.be.called;
        });

        it('should directly print if print blob is ready and the print dialog hasn\'t been shown yet', () => {
            office.printBlob = {};
            office.printDialogTimeout = setTimeout(() => {});
            sandbox.stub(office, 'browserPrint');

            office.print();
            expect(office.browserPrint).to.be.called;
        });

        it('should directly print if print blob is ready and the print dialog isn\'t visible', () => {
            office.printBlob = {};
            office.printDialogTimeout = null;
            sandbox.stub(office.printPopup, 'isVisible').returns(false);
            sandbox.stub(office, 'browserPrint');

            office.print();
            expect(office.browserPrint).to.be.called;
        });

        it('should show the print popup and disable the print button if the blob is not ready', () => {
            sandbox.stub(office.printPopup, 'disableButton');

            office.print();
            clock.tick(PRINT_DIALOG_TIMEOUT_MS + 1);

            expect(stubs.show).to.be.calledWith(__('print_loading'), __('print'), sinon.match.func);
            expect(office.printPopup.disableButton).to.be.called;

            clock.restore();
        });

        it('should update the print popup UI if popup is visible and there is no current print timeout', () => {
            office.printBlob = {};

            sandbox.stub(office.printPopup, 'isVisible').returns(true);

            office.print();

            expect(office.printPopup.buttonEl.classList.contains('is-disabled')).to.be.false;
            expect(office.printPopup.messageEl.textContent).to.equal(__('print_ready'));
            expect(office.printPopup.loadingIndicator.classList.contains(CLASS_HIDDEN)).to.be.true;
            expect(office.printPopup.printCheckmark.classList.contains(CLASS_HIDDEN)).to.be.false;
        });
    });

    describe('initPrint()', () => {
        it('should add print checkmark', () => {
            office.initPrint();
            const mockCheckmark = document.createElement('div');
            mockCheckmark.innerHTML = `${ICON_PRINT_CHECKMARK}`.trim();
            expect(office.printPopup.printCheckmark.innerHTML).to.equal(mockCheckmark.innerHTML);
        });

        it('should hide the print checkmark', () => {
            office.initPrint();
            expect(office.printPopup.printCheckmark.classList.contains(CLASS_HIDDEN));
        });
    });

    describe('browserPrint()', () => {
        beforeEach(() => {
            stubs.emit = sandbox.stub(office, 'emit');
            stubs.createObject = sandbox.stub(URL, 'createObjectURL');
            stubs.open = sandbox.stub(window, 'open').returns(false);
            stubs.browser = sandbox.stub(Browser, 'getName').returns('Chrome');
            stubs.revokeObjectURL = sandbox.stub(URL, 'revokeObjectURL');
            stubs.printResult = {
                print: sandbox.stub(),
                addEventListener: sandbox.stub()
            };
            office.printBlob = true;
            window.navigator.msSaveOrOpenBlob = sandbox.stub().returns(true);
        });

        it('should use the open or save dialog if on IE or Edge', () => {
            office.browserPrint();
            expect(window.navigator.msSaveOrOpenBlob).to.be.called;
            expect(stubs.emit).to.be.called;
        });

        it('should use the open or save dialog if on IE or Edge and emit a message', () => {
            office.browserPrint();
            expect(window.navigator.msSaveOrOpenBlob).to.be.called;
            expect(stubs.emit).to.be.called;
        });

        it('should emit an error message if the print result fails on IE or Edge', () => {
            window.navigator.msSaveOrOpenBlob.returns(false);

            office.browserPrint();
            expect(window.navigator.msSaveOrOpenBlob).to.be.called;
            expect(stubs.emit).to.be.calledWith('printerror');
        });

        it('should open the pdf in a new tab if not on IE or Edge', () => {
            window.navigator.msSaveOrOpenBlob = undefined;

            office.browserPrint();
            expect(stubs.createObject).to.be.calledWith(office.printBlob);
            expect(stubs.open).to.be.called.with;
            expect(stubs.emit).to.be.called;
        });

        it('should print on load in the chrome browser', () => {
            window.navigator.msSaveOrOpenBlob = undefined;
            stubs.open.returns(stubs.printResult);

            office.browserPrint();
            expect(stubs.createObject).to.be.calledWith(office.printBlob);
            expect(stubs.open).to.be.called.with;
            expect(stubs.browser).to.be.called;
            expect(stubs.emit).to.be.called;
            expect(stubs.revokeObjectURL).to.be.called;
        });

        it('should use a timeout in safari', () => {
            window.navigator.msSaveOrOpenBlob = undefined;
            stubs.open.returns(stubs.printResult);
            stubs.browser.returns('Safari');

            office.browserPrint();
            clock.tick(PRINT_TIMEOUT_MS + 1000);

            expect(stubs.createObject).to.be.calledWith(office.printBlob);
            expect(stubs.open).to.be.called;
            expect(stubs.browser).to.be.called;
            expect(stubs.printResult.print).to.be.called;
            expect(stubs.emit).to.be.called;
        });
    });

    describe('fetchPrintBlob()', () => {
        beforeEach(() => {
            stubs.promise = Promise.resolve({ blob: 'blob' });
            stubs.get = sandbox.stub(util, 'get').returns(stubs.promise);
            stubs.appendAuthHeader = sandbox.stub(office, 'appendAuthHeader');
            office.initPrint();
        });

        it('should get and return the blob', () => {
            office.fetchPrintBlob('url');

            return stubs.promise.then((blob) => {
                expect(stubs.get).to.be.called;
                expect(blob.blob).to.equal('blob');
            });
        });
    });
});
