/* eslint-disable no-unused-expressions */
import Base from '../../base';
import Browser from '../../../browser';
import Office from '../office';
import * as util from '../../../util';
import { CLASS_HIDDEN } from '../../../constants';
import { ICON_PRINT_CHECKMARK } from '../../../icons/icons';

const PRINT_TIMEOUT_MS = 1000; // Wait 1s before trying to print
const PRINT_DIALOG_TIMEOUT_MS = 500;
const sandbox = sinon.sandbox.create();
let office;
let stubs = {};

describe('office.js', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/office/__tests__/office-test.html');
        office = new Office({
            container: '.container',
            file: {
                id: '123'
            }
        });
        stubs = {
            setupPDFUrl: sandbox.stub(office, 'setupPDFUrl')
        };
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();

        if (office && typeof office.destroy === 'function') {
            office.destroy();
        }
        office = null;
    });

    describe('setup()', () => {
        it('should set up the Office viewer', () => {
            const testStubs = {
                setupIframe: sandbox.stub(office, 'setupIframe'),
                initPrint: sandbox.stub(office, 'initPrint')
            };
            office.setup();
            expect(testStubs.setupIframe).to.be.called;
            expect(testStubs.initPrint).to.be.called;
            expect(stubs.setupPDFUrl).to.be.called;
        });
    });

    beforeEach(() => {
        office.setup();
    });

    describe('destroy()', () => {
        it('should clear the print blob', () => {
            office.printBlob = {};
            office.destroy();
            expect(office.printBlob).to.equal(null);
        });
    });

    describe('load()', () => {
        const loadFunc = Base.prototype.load;

        afterEach(() => {
            Object.defineProperty(Base.prototype, 'load', { value: loadFunc });
        });

        it('should call setup and load the Office viewer', () => {
            const setupStub = sandbox.stub(office, 'setup');
            Object.defineProperty(Base.prototype, 'load', { value: sandbox.stub() });

            office.load();

            expect(setupStub).to.be.called;
            expect(Base.prototype.load).to.be.called;
        });
    });

    describe('setupIframe()', () => {
        it('should initialize iframe element and set relevant attributes', () => {
            expect(office.iframeEl.width).to.equal('100%');
            expect(office.iframeEl.height).to.equal('100%');
            expect(office.iframeEl.frameBorder).to.equal('0');
            expect(office.iframeEl.sandbox.toString()).to.equal('allow-scripts allow-same-origin allow-forms allow-popups');
            expect(office.loadTimeout).to.equal(120000);
        });

        it('should load a xlsx file and set the file ID in src url on load event when the file is not a shared link', () => {
            office.setupIframe();
            expect(office.iframeEl.src).to.equal('https://app.box.com/integrations/officeonline/openExcelOnlinePreviewer?fileId=123');
        });

        it('should load a xlsx file and set the shared name in src url on load event when the file is a shared link', () => {
            office.options.sharedLink = 'https://app.box.com/s/abcd';
            office.setupIframe();
            expect(office.iframeEl.src).to.equal('https://app.box.com/integrations/officeonline/openExcelOnlinePreviewer?s=abcd&fileId=123');
        });

        it('should load a xlsx file and set the vanity name in src url on load event when the file is a vanity url without a subdomain', () => {
            office.options.sharedLink = 'https://app.box.com/v/test';
            office.setupIframe();
            expect(office.iframeEl.src).to.equal('https://app.box.com/integrations/officeonline/openExcelOnlinePreviewer?v=test&vanity_subdomain=app&fileId=123');
        });

        it('should load a xlsx file and set the vanity name in src url on load event when the file is a vanity url with a subdomain', () => {
            office.options.sharedLink = 'https://cloud.app.box.com/v/test';
            office.setupIframe();
            expect(office.iframeEl.src).to.equal('https://app.box.com/integrations/officeonline/openExcelOnlinePreviewer?v=test&vanity_subdomain=cloud&fileId=123');
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

        it('should add the loading indicator', () => {
            office.initPrint();
            const mockIndicator = document.createElement('div');
            mockIndicator.innerHTML = `
            <div></div>
            <div></div>
            <div></div>
            `.trim();
            expect(office.printPopup.loadingIndicator.innerHTML).to.equal(mockIndicator.innerHTML);
            expect(office.printPopup.loadingIndicator.classList.contains('bp-crawler')).to.be.true;
        });
    });

    describe('print()', () => {
        let clock;

        beforeEach(() => {
            clock = sinon.useFakeTimers();
            office.printBlob = undefined;
            stubs.fetchPrintBlob = sandbox.stub(office, 'fetchPrintBlob').returns({
                then: sandbox.stub()
            });
            office.initPrint();
            stubs.show = sandbox.stub(office.printPopup, 'show');
        });

        afterEach(() => {
            clock.restore();
        });

        it('should request the print blob if it is not ready', () => {
            office.print();
            expect(stubs.fetchPrintBlob).to.be.called;
        });

        it('should show the print popup and disable the print button if the blob is not ready', () => {
            sandbox.stub(office.printPopup, 'disableButton');

            office.print();
            clock.tick(PRINT_DIALOG_TIMEOUT_MS + 1);

            expect(stubs.show).to.be.calledWith(__('print_loading'), __('print'), sinon.match.func);
            expect(office.printPopup.disableButton).to.be.called;

            clock.restore();
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

    describe('browserPrint()', () => {
        beforeEach(() => {
            stubs.emit = sandbox.stub(office, 'emit');
            stubs.createObject = sandbox.stub(URL, 'createObjectURL');
            stubs.open = sandbox.stub(window, 'open').returns(false);
            stubs.browser = sandbox.stub(Browser, 'getName').returns('Chrome');
            stubs.revokeObjectURL = sandbox.stub(URL, 'revokeObjectURL');
            stubs.printResult = { print: sandbox.stub(), addEventListener: sandbox.stub() };
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
            let clock = sinon.useFakeTimers();
            window.navigator.msSaveOrOpenBlob = undefined;
            stubs.open.returns(stubs.printResult);
            stubs.browser.returns('Safari');

            office.browserPrint();
            clock.tick(PRINT_TIMEOUT_MS + 1);
            expect(stubs.createObject).to.be.calledWith(office.printBlob);
            expect(stubs.open).to.be.called;
            expect(stubs.browser).to.be.called;
            expect(stubs.printResult.print).to.be.called;
            expect(stubs.emit).to.be.called;

            clock = undefined;
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
