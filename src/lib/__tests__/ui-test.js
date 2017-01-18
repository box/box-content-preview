/* eslint-disable no-unused-expressions */
import shellTemplate from '../shell.html';
import * as constants from '../constants';
import * as ui from '../ui';
import * as util from '../util';

const sandbox = sinon.sandbox.create();

describe('ui', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('__tests__/ui-test.html');
    });

    afterEach(() => {
        fixture.cleanup();
        sandbox.verifyAndRestore();
    });

    describe('setup()', () => {
        it('should setup shell structure, header, and loading state', () => {
            const containerEl = document.querySelector('.ui');
            const options = {
                container: containerEl
            };
            const handler = () => {};

            sandbox.spy(util, 'insertTemplate');

            const resultEl = ui.setup(options, handler, handler, handler, handler);

            // Check shell structure
            expect(util.insertTemplate).to.have.been.calledWith(containerEl, shellTemplate);
            expect(resultEl).to.equal(containerEl.querySelector(constants.SELECTOR_BOX_PREVIEW_CONTAINER));

            // Check header
            expect(resultEl.firstElementChild.className).to.equal(constants.CLASS_BOX_PREVIEW_HEADER);

            // Check loading state
            const loadingWrapperEl = resultEl.querySelector(constants.SELECTOR_BOX_PREVIEW_LOADING_WRAPPER);
            expect(loadingWrapperEl.querySelector(constants.SELECTOR_BOX_PREVIEW_ICON).innerHTML).to.not.equal('');
            expect(loadingWrapperEl.querySelector(constants.SELECTOR_BOX_PREVIEW_LOADING_TEXT).textContent).to.equal('Generating Preview...');
            expect(loadingWrapperEl.querySelector(constants.SELECTOR_BOX_PREVIEW_BTN_LOADING_DOWNLOAD).textContent).to.equal('Download File');
        });

        it('should setup logo if option specifies', () => {
            const containerEl = document.querySelector('.ui');
            const url = 'http://someurl.com/';
            const options = {
                container: containerEl,
                logoUrl: url
            };
            const handler = () => {};

            const resultEl = ui.setup(options, handler, handler, handler, handler);

            // Check logo
            expect(resultEl.querySelector(constants.SELECTOR_BOX_PREVIEW_LOGO_DEFAULT).classList.contains(constants.CLASS_HIDDEN)).to.be.true;

            const logoEl = resultEl.querySelector(constants.SELECTOR_BOX_PREVIEW_LOGO_CUSTOM);
            expect(logoEl.classList.contains(constants.CLASS_HIDDEN)).to.be.false;
            expect(logoEl.src).to.equal(url);
        });
    });

    describe('visibility functions', () => {
        let containerEl;

        beforeEach(() => {
            const wrapperEl = document.querySelector('.ui');
            const options = {
                container: wrapperEl
            };
            const handler = () => {};
            containerEl = ui.setup(options, handler, handler, handler, handler);
        });

        afterEach(() => {
            ui.cleanup();
        });

        describe('showNavigation()', () => {
            it('should set up nav titles', () => {
                ui.showNavigation('1', ['1']);

                const leftNavEl = containerEl.querySelector(constants.SELECTOR_NAVIGATION_LEFT);
                const rightNavEl = containerEl.querySelector(constants.SELECTOR_NAVIGATION_RIGHT);
                expect(leftNavEl.title).to.equal('Previous file');
                expect(rightNavEl.title).to.equal('Next file');
            });

            it('should remove nav event listeners if collection only has one file', () => {
                const leftNavEl = containerEl.querySelector(constants.SELECTOR_NAVIGATION_LEFT);
                const rightNavEl = containerEl.querySelector(constants.SELECTOR_NAVIGATION_RIGHT);
                sandbox.stub(leftNavEl, 'removeEventListener');
                sandbox.stub(rightNavEl, 'removeEventListener');

                ui.showNavigation('1', ['1']);

                expect(leftNavEl.removeEventListener).to.have.been.calledWith('click', sinon.match.any);
                expect(rightNavEl.removeEventListener).to.have.been.calledWith('click', sinon.match.any);
            });

            it('should reset nav event listeners if collection has more than one file', () => {
                const leftNavEl = containerEl.querySelector(constants.SELECTOR_NAVIGATION_LEFT);
                const rightNavEl = containerEl.querySelector(constants.SELECTOR_NAVIGATION_RIGHT);
                sandbox.stub(leftNavEl, 'removeEventListener');
                sandbox.stub(leftNavEl, 'addEventListener');
                sandbox.stub(rightNavEl, 'removeEventListener');
                sandbox.stub(rightNavEl, 'addEventListener');

                ui.showNavigation('1', ['1', '2']);

                expect(leftNavEl.removeEventListener).to.have.been.calledWith('click', sinon.match.any);
                expect(rightNavEl.removeEventListener).to.have.been.calledWith('click', sinon.match.any);
                expect(leftNavEl.addEventListener).to.have.been.calledWith('click', sinon.match.any);
                expect(rightNavEl.addEventListener).to.have.been.calledWith('click', sinon.match.any);
            });

            it('should show left nav arrow if passed in ID is not the first in the collection', () => {
                const leftNavEl = containerEl.querySelector(constants.SELECTOR_NAVIGATION_LEFT);
                sandbox.stub(leftNavEl.classList, 'remove');

                ui.showNavigation('2', ['1', '2']);

                expect(leftNavEl.classList.remove).to.have.been.calledWith(constants.CLASS_HIDDEN);
            });

            it('should show right nav arrow if passed in ID is not the last in the collection', () => {
                const rightNavEl = containerEl.querySelector(constants.SELECTOR_NAVIGATION_RIGHT);
                sandbox.stub(rightNavEl.classList, 'remove');

                ui.showNavigation('1', ['1', '2']);

                expect(rightNavEl.classList.remove).to.have.been.calledWith(constants.CLASS_HIDDEN);
            });
        });

        describe('showAnnotateButton()', () => {
            it('should set up and show annotate button', () => {
                const handler = () => {};
                const annotationButtonEl = containerEl.querySelector(constants.SELECTOR_BOX_PREVIEW_BTN_ANNOTATE);
                annotationButtonEl.classList.add(constants.CLASS_HIDDEN);
                sandbox.stub(annotationButtonEl, 'addEventListener');

                ui.showAnnotateButton(handler);

                expect(annotationButtonEl.title).to.equal('Point annotation mode');
                expect(annotationButtonEl.classList.contains(constants.CLASS_HIDDEN)).to.be.false;
                expect(annotationButtonEl.addEventListener).to.have.been.calledWith('click', handler);
            });
        });

        describe('showPrintButton()', () => {
            it('should set up and show print button', () => {
                const handler = () => {};
                const printButtonEl = containerEl.querySelector(constants.SELECTOR_BOX_PREVIEW_BTN_PRINT);
                printButtonEl.classList.add(constants.CLASS_HIDDEN);
                sandbox.stub(printButtonEl, 'addEventListener');

                ui.showPrintButton(handler);

                expect(printButtonEl.title).to.equal('Print');
                expect(printButtonEl.classList.contains(constants.CLASS_HIDDEN)).to.be.false;
                expect(printButtonEl.addEventListener).to.have.been.calledWith('click', handler);
            });
        });

        describe('showDownloadButton()', () => {
            it('should set up and show download button', () => {
                const handler = () => {};
                const downloadButtonEl = containerEl.querySelector(constants.SELECTOR_BOX_PREVIEW_BTN_DOWNLOAD);
                downloadButtonEl.classList.add(constants.CLASS_HIDDEN);
                sandbox.stub(downloadButtonEl, 'addEventListener');

                ui.showDownloadButton(handler);

                expect(downloadButtonEl.title).to.equal('Download');
                expect(downloadButtonEl.classList.contains(constants.CLASS_HIDDEN)).to.be.false;
                expect(downloadButtonEl.addEventListener).to.have.been.calledWith('click', handler);
            });
        });

        describe('showLoadingDownloadButton()', () => {
            it('should set up and show loading download button', () => {
                const handler = () => {};
                const downloadButtonEl = containerEl.querySelector(constants.SELECTOR_BOX_PREVIEW_BTN_LOADING_DOWNLOAD);
                downloadButtonEl.classList.add(constants.CLASS_INVISIBLE);
                sandbox.stub(downloadButtonEl, 'addEventListener');

                ui.showLoadingDownloadButton(handler);

                expect(downloadButtonEl.title).to.equal('Download');
                expect(downloadButtonEl.classList.contains(constants.CLASS_INVISIBLE)).to.be.false;
                expect(downloadButtonEl.addEventListener).to.have.been.calledWith('click', handler);
            });

            it('should use visibility hidden to show loading download button, not display none', () => {
                const handler = () => {};
                const downloadButtonEl = containerEl.querySelector(constants.SELECTOR_BOX_PREVIEW_BTN_LOADING_DOWNLOAD);
                downloadButtonEl.classList.add(constants.CLASS_HIDDEN);
                downloadButtonEl.classList.add(constants.CLASS_INVISIBLE);

                ui.showLoadingDownloadButton(handler);

                expect(downloadButtonEl.classList.contains(constants.CLASS_INVISIBLE)).to.be.false;
                expect(downloadButtonEl.classList.contains(constants.CLASS_HIDDEN)).to.be.true;
            });
        });

        describe('showLoadingIndicator()', () => {
            it('should show loading indicator', () => {
                const contentContainerEl = containerEl.querySelector(constants.SELECTOR_BOX_PREVIEW);
                contentContainerEl.classList.add(constants.CLASS_PREVIEW_LOADED);

                ui.showLoadingIndicator();

                expect(contentContainerEl.classList.contains(constants.CLASS_PREVIEW_LOADED)).to.be.false;
            });
        });

        describe('hideLoadingIndicator()', () => {
            it('should hide loading indicator', () => {
                const contentContainerEl = containerEl.querySelector(constants.SELECTOR_BOX_PREVIEW);
                contentContainerEl.classList.remove(constants.CLASS_PREVIEW_LOADED);

                ui.hideLoadingIndicator();

                expect(contentContainerEl.classList.contains(constants.CLASS_PREVIEW_LOADED)).to.be.true;
            });
        });
    });

    describe('cleanup()', () => {
        it('should clean up shell', () => {
            const wrapperEl = document.querySelector('.ui');
            const options = {
                container: wrapperEl
            };
            const someHandler = () => {};
            const mousemoveHandler = () => {};
            const keydownHandler = () => {};

            const containerEl = ui.setup(options, keydownHandler, someHandler, someHandler, mousemoveHandler);

            const contentContainerEl = containerEl.querySelector(constants.SELECTOR_BOX_PREVIEW);
            sandbox.stub(contentContainerEl, 'removeEventListener');
            sandbox.stub(document, 'removeEventListener');

            ui.cleanup();

            expect(contentContainerEl.removeEventListener).to.have.been.calledWith('mousemove', mousemoveHandler);
            expect(containerEl.innerHTML).to.equal('');
            expect(document.removeEventListener).to.have.been.calledWith('keydown', keydownHandler);
        });
    });
});
