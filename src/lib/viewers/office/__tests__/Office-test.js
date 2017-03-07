/* eslint-disable no-unused-expressions */
import Base from '../../Base';
import Office from '../Office';
import * as printUtil from '../../../print-util';

const sandbox = sinon.sandbox.create();
let office;
let stubs = {};

describe('lib/viewers/office/Office', () => {
    let clock;

    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/office/__tests__/Office-test.html');
        office = new Office({
            container: '.container',
            file: {
                id: '123'
            }
        });
        stubs = {
            setupPDFUrl: sandbox.stub(office, 'setupPDFUrl')
        };
        clock = sinon.useFakeTimers();
    });

    afterEach(() => {
        clock.restore();
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
                initPrint: sandbox.stub(printUtil, 'initPrint')
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
        it('should destroy print related objects', () => {
            const printDestroyStub = sandbox.spy(printUtil, 'destroyPrint');
            office.destroy();
            expect(printDestroyStub).to.be.called;
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
        beforeEach(() => {
            office.options.appHost = 'https://app.box.com';
        });

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
});
