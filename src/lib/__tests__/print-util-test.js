/* eslint-disable no-unused-expressions */
import 'isomorphic-fetch';

import Browser from '../Browser';
import * as util from '../util';
import * as printUtil from '../print-util';
import { CLASS_HIDDEN } from '../constants';
import { ICON_PRINT_CHECKMARK } from '../icons/icons';

const SAFARI_PRINT_TIMEOUT_MS = 1000;

const sandbox = sinon.sandbox.create();
let stubs;
let containerEl;

describe('lib/print-util', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('__tests__/print-util-test.html');

        containerEl = document.querySelector('.container');
        stubs = {};
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();
        stubs = null;
        containerEl = null;
    });

    describe('initPrint()', () => {
        it('should add print checkmark', () => {
            const printPopup = printUtil.initPrint(containerEl);

            const mockCheckmark = document.createElement('div');
            mockCheckmark.innerHTML = `${ICON_PRINT_CHECKMARK}`.trim();
            expect(printPopup.printCheckmark.innerHTML).to.equal(mockCheckmark.innerHTML);
        });

        it('should hide the print checkmark', () => {
            const printPopup = printUtil.initPrint(containerEl);

            expect(printPopup.printCheckmark.classList.contains(CLASS_HIDDEN));
        });

        it('should add the loading indicator', () => {
            const printPopup = printUtil.initPrint(containerEl);

            const mockIndicator = document.createElement('div');
            mockIndicator.innerHTML = `<div></div>
            <div></div>
            <div></div>`.split(' ').join('');
            expect(printPopup.loadingIndicator.innerHTML.split(' ').join('')).to.equal(mockIndicator.innerHTML);
            expect(printPopup.loadingIndicator.classList.contains('bp-crawler')).to.be.true;
        });
    });

    describe('showPrintPopup()', () => {
        beforeEach(() => {
            stubs.printPopup = {
                show: sandbox.stub(),
                disableButton: sandbox.stub()
            };
            stubs.callBack = sandbox.stub();
        });

        it('should show the popup', () => {
            printUtil.showPrintPopup(stubs.printPopup, stubs.callBack);
            expect(stubs.printPopup.show).to.be.calledWith(__('print_loading'), __('print'), sinon.match.func);
        });

        it('should disable the print button', () => {
            printUtil.showPrintPopup(stubs.printPopup, stubs.callBack);
            expect(stubs.printPopup.disableButton).to.be.called;
        });
    });

    describe('enablePrintPopup()', () => {
        beforeEach(() => {
            stubs.printPopup = printUtil.initPrint(containerEl);
            stubs.enableButton = sandbox.stub(stubs.printPopup, 'enableButton');
        });

        afterEach(() => {
            stubs.printPopup.destroy();
        });

        it('should enable the print button', () => {
            printUtil.enablePrintPopup(stubs.printPopup);
            expect(stubs.enableButton).to.be.called;
        });

        it('should update the popup message and swap in the correct icon', () => {
            printUtil.enablePrintPopup(stubs.printPopup);
            expect(stubs.printPopup.messageEl.textContent).to.equal(__('print_ready'));
            expect(stubs.printPopup.loadingIndicator).to.have.class(CLASS_HIDDEN);
            expect(stubs.printPopup.printCheckmark).to.not.have.class(CLASS_HIDDEN);
        });
    });

    describe('fetchPrintBlob()', () => {
        beforeEach(() => {
            stubs.promise = Promise.resolve({ blob: 'blob' });
            stubs.get = sandbox.stub(util, 'get').returns(stubs.promise);
        });

        it('should get and return the blob', () => {
            printUtil.fetchPrintBlob('url');

            return stubs.promise.then((blob) => {
                expect(stubs.get).to.be.called;
                expect(blob.blob).to.equal('blob');
            });
        });
    });

    describe('browserPrint()', () => {
        beforeEach(() => {
            stubs.createObject = sandbox.stub(URL, 'createObjectURL');
            stubs.open = sandbox.stub(window, 'open').returns(false);
            stubs.blob = 'blob';
            stubs.browser = sandbox.stub(Browser, 'getName').returns('Chrome');
            stubs.revokeObjectURL = sandbox.stub(URL, 'revokeObjectURL');
            stubs.printResult = { print: sandbox.stub(), addEventListener: sandbox.stub() };
            window.navigator.msSaveOrOpenBlob = sandbox.stub().returns(true);
        });

        it('should use the open or save dialog if on IE or Edge', () => {
            printUtil.browserPrint(stubs.blob);
            expect(window.navigator.msSaveOrOpenBlob).to.be.called;
        });

        it('should use the open or save dialog if on IE or Edge and emit a message', () => {
            const result = printUtil.browserPrint(stubs.blob);
            expect(window.navigator.msSaveOrOpenBlob).to.be.called;
            expect(result).to.equal('printsuccess');
        });

        it('should emit an error message if the print result fails on IE or Edge', () => {
            window.navigator.msSaveOrOpenBlob.returns(false);

            const result = printUtil.browserPrint(stubs.blob);
            expect(window.navigator.msSaveOrOpenBlob).to.be.called;
            expect(result).to.equal('printerror');
        });

        it('should open the pdf in a new tab if not on IE or Edge', () => {
            window.navigator.msSaveOrOpenBlob = undefined;

            printUtil.browserPrint(stubs.blob);
            expect(stubs.createObject).to.be.calledWith(stubs.blob);
            expect(stubs.open).to.be.called.with;
        });

        it('should print on load in the chrome browser', () => {
            window.navigator.msSaveOrOpenBlob = undefined;
            stubs.open.returns(stubs.printResult);

            printUtil.browserPrint(stubs.blob);
            expect(stubs.createObject).to.be.calledWith(stubs.blob);
            expect(stubs.open).to.be.called.with;
            expect(stubs.browser).to.be.called;
            expect(stubs.revokeObjectURL).to.be.called;
        });

        it('should use a timeout in safari', () => {
            let clock = sinon.useFakeTimers();
            window.navigator.msSaveOrOpenBlob = undefined;
            stubs.open.returns(stubs.printResult);
            stubs.browser.returns('Safari');

            printUtil.browserPrint(stubs.blob);
            clock.tick(SAFARI_PRINT_TIMEOUT_MS + 1);
            expect(stubs.createObject).to.be.calledWith(stubs.blob);
            expect(stubs.open).to.be.called;
            expect(stubs.browser).to.be.called;
            expect(stubs.printResult.print).to.be.called;
            clock = undefined;
        });
    });

    describe('printPDF()', () => {
        beforeEach(() => {
            stubs.blob = 'blob';
            stubs.printPopup = printUtil.initPrint(containerEl);
            stubs.isVisible = sandbox.stub(stubs.printPopup, 'isVisible');
            stubs.enableButton = sandbox.stub(stubs.printPopup, 'enableButton');
        });

        it('should clear the timeout and print if the popup is not visible', () => {
            stubs.isVisible.returns(false);
            sandbox.mock(window).expects('clearTimeout');

            const result = printUtil.printPDF(stubs.blob, false, stubs.printPopup);
            expect(result).to.equal('printsuccess');
        });

        it('should clear the timeout and print if the timeout has not expired yet', () => {
            stubs.isVisible.returns(true);
            sandbox.mock(window).expects('clearTimeout');

            const result = printUtil.printPDF(stubs.blob, true, stubs.printPopup);
            expect(result).to.equal('printsuccess');
        });

        it('should set the print popup to be ready ', () => {
            stubs.isVisible.returns(true);

            const result = printUtil.printPDF(stubs.blob, false, stubs.printPopup);
            expect(result).to.equal(undefined);
            expect(stubs.enableButton).to.be.called;
        });
    });
});
