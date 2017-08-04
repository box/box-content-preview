/* eslint-disable no-unused-expressions */
import * as constants from '../constants';
import PreviewUI from '../PreviewUI';

let ui;
const sandbox = sinon.sandbox.create();

describe('lib/PreviewUI', () => {
    let containerEl;
    let options;
    const handler = () => {};

    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        ui = new PreviewUI();
        fixture.load('__tests__/PreviewUI-test.html');
        containerEl = document.querySelector('.ui');
        options = {
            container: containerEl
        };
    });

    afterEach(() => {
        fixture.cleanup();
        sandbox.verifyAndRestore();
    });

    describe('cleanup()', () => {
        it('should destroy progress bar, clean up shell, and remove event listeners', () => {
            const resultEl = ui.setup(options, handler, null, null, handler);

            sandbox.stub(ui.progressBar, 'destroy');
            const contentContainerEl = containerEl.querySelector(constants.SELECTOR_BOX_PREVIEW);
            sandbox.mock(contentContainerEl).expects('removeEventListener').withArgs('mousemove', handler);
            sandbox.mock(document).expects('removeEventListener').withArgs('keydown', handler);

            ui.cleanup();

            expect(ui.progressBar.destroy).to.be.called;
            expect(resultEl).to.be.empty;
        });
    });

    describe('setup()', () => {
        it('should setup shell structure, header, progress bar, and loading state', () => {
            const resultEl = ui.setup(options);

            // Check shell structure
            expect(resultEl).to.equal(containerEl.querySelector(constants.SELECTOR_BOX_PREVIEW_CONTAINER));

            // Check header
            expect(resultEl).to.contain(constants.SELECTOR_BOX_PREVIEW_HEADER);

            // Check progress bar
            expect(resultEl).to.contain(constants.SELECTOR_BOX_PREVIEW_PROGRESS_BAR);

            // Check loading state
            const loadingWrapperEl = resultEl.querySelector(constants.SELECTOR_BOX_PREVIEW_LOADING_WRAPPER);
            expect(loadingWrapperEl).to.contain(constants.SELECTOR_BOX_PREVIEW_ICON);
            expect(loadingWrapperEl).to.contain.html('Loading Preview...');
            expect(loadingWrapperEl).to.contain.html('Download File');
        });

        it('should setup logo if option specifies', () => {
            const url = 'http://someurl.com/';
            options.logoUrl = url;
            const resultEl = ui.setup(options);

            // Check logo
            const defaultLogoEl = resultEl.querySelector(constants.SELECTOR_BOX_PREVIEW_LOGO_DEFAULT);
            const customLogoEl = resultEl.querySelector(constants.SELECTOR_BOX_PREVIEW_LOGO_CUSTOM);
            expect(defaultLogoEl).to.have.class(constants.CLASS_HIDDEN);
            expect(customLogoEl).to.not.have.class(constants.CLASS_HIDDEN);
            expect(customLogoEl.src).to.equal(url);
        });
    });

    describe('visibility functions', () => {
        beforeEach(() => {
            containerEl = ui.setup(options);
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
                sandbox.mock(leftNavEl).expects('removeEventListener').withArgs('click');
                sandbox.mock(rightNavEl).expects('removeEventListener').withArgs('click');

                ui.showNavigation('1', ['1']);
            });

            it('should reset nav event listeners if collection has more than one file', () => {
                const leftNavEl = containerEl.querySelector(constants.SELECTOR_NAVIGATION_LEFT);
                const rightNavEl = containerEl.querySelector(constants.SELECTOR_NAVIGATION_RIGHT);
                sandbox.mock(leftNavEl).expects('removeEventListener').withArgs('click');
                sandbox.mock(rightNavEl).expects('removeEventListener').withArgs('click');

                ui.showNavigation('1', ['1', '2']);
            });

            it('should show left nav arrow if passed in ID is not the first in the collection', () => {
                const leftNavEl = containerEl.querySelector(constants.SELECTOR_NAVIGATION_LEFT);
                sandbox.mock(leftNavEl).expects('removeEventListener').withArgs('click');
                sandbox.mock(leftNavEl.classList).expects('remove').withArgs(constants.CLASS_HIDDEN);

                ui.showNavigation('2', ['1', '2']);
            });

            it('should show right nav arrow if passed in ID is not the last in the collection', () => {
                const rightNavEl = containerEl.querySelector(constants.SELECTOR_NAVIGATION_RIGHT);
                sandbox.mock(rightNavEl).expects('addEventListener').withArgs('click');
                sandbox.mock(rightNavEl.classList).expects('remove').withArgs(constants.CLASS_HIDDEN);

                ui.showNavigation('1', ['1', '2']);
            });
        });

        describe('showPrintButton()', () => {
            it('should set up and show print button', () => {
                const buttonEl = containerEl.querySelector(constants.SELECTOR_BOX_PREVIEW_BTN_PRINT);
                buttonEl.classList.add(constants.CLASS_HIDDEN);
                sandbox.mock(buttonEl).expects('addEventListener').withArgs('click', handler);

                ui.showPrintButton(handler);

                expect(buttonEl.title).to.equal('Print');
                expect(buttonEl.classList.contains(constants.CLASS_HIDDEN)).to.be.false;
            });
        });

        describe('showDownloadButton()', () => {
            it('should set up and show download button', () => {
                const buttonEl = containerEl.querySelector(
                    constants.SELECTOR_BOX_PREVIEW_BTN_DOWNLOAD
                );
                buttonEl.classList.add(constants.CLASS_HIDDEN);
                sandbox.mock(buttonEl).expects('addEventListener').withArgs('click', handler);

                ui.showDownloadButton(handler);

                expect(buttonEl.title).to.equal('Download');
                expect(buttonEl.classList.contains(constants.CLASS_HIDDEN)).to.be.false;
            });
        });

        describe('showLoadingDownloadButton()', () => {
            it('should set up and show loading download button', () => {
                const buttonEl = containerEl.querySelector(
                    constants.SELECTOR_BOX_PREVIEW_BTN_LOADING_DOWNLOAD
                );
                buttonEl.classList.add(constants.CLASS_INVISIBLE);
                sandbox.mock(buttonEl).expects('addEventListener').withArgs('click', handler);

                ui.showLoadingDownloadButton(handler);

                expect(buttonEl.title).to.equal('Download');
                expect(buttonEl.classList.contains(constants.CLASS_INVISIBLE)).to.be.false;
            });
        });

        describe('showLoadingIndicator()', () => {
            it('should show loading indicator', () => {
                const contentContainerEl = containerEl.querySelector(constants.SELECTOR_BOX_PREVIEW);
                contentContainerEl.classList.add(constants.CLASS_PREVIEW_LOADED);

                ui.showLoadingIndicator();

                expect(contentContainerEl).to.not.have.class(constants.CLASS_PREVIEW_LOADED);
            });
        });

        describe('hideLoadingIndicator()', () => {
            it('should hide loading indicator and intializes the notification', () => {
                const contentContainerEl = containerEl.querySelector(constants.SELECTOR_BOX_PREVIEW);
                ui.hideLoadingIndicator();
                expect(contentContainerEl).to.have.class(constants.CLASS_PREVIEW_LOADED);

                // Check that notification is initialized
                expect(contentContainerEl).to.contain('.bp-notification');
            });

            it('should remove the hidden class from the crawler', () => {
                const crawlerEl = containerEl.querySelector(constants.SELECTOR_BOX_PREVIEW_CRAWLER_WRAPPER);
                ui.hideLoadingIndicator();
                expect(crawlerEl).to.not.have.class(constants.CLASS_HIDDEN);
            });
        });
    });

    describe('getAnnotateButton()', () => {
        it('should return the annotate button', () => {
            containerEl = ui.setup(options);
            const buttonEl = ui.getAnnotateButton(constants.SELECTOR_BOX_PREVIEW_BTN_ANNOTATE_POINT);
            expect(buttonEl).to.equal(containerEl.querySelector(constants.SELECTOR_BOX_PREVIEW_BTN_ANNOTATE_POINT));
        });
    });

    describe('startProgressBar()', () => {
        it('should start the progress bar', () => {
            ui.progressBar = {
                start: sandbox.stub()
            };

            ui.startProgressBar();
            expect(ui.progressBar.start).to.be.called;
        });
    });

    describe('finishProgressBar()', () => {
        it('should finish the progress bar', () => {
            ui.progressBar = {
                finish: sandbox.stub()
            };

            ui.finishProgressBar();
            expect(ui.progressBar.finish).to.be.called;
        });
    });

    describe('showNotification()', () => {
        it('should show a notification message', () => {
            ui.notification = {
                show: sandbox.stub()
            };

            ui.showNotification('message');
            expect(ui.notification.show).to.be.called;
        });
    });

    describe('hideNotification()', () => {
        it('should hide the notification message', () => {
            ui.notification = {
                hide: sandbox.stub()
            };

            ui.hideNotification('message');
            expect(ui.notification.hide).to.be.called;
        });
    });
});
