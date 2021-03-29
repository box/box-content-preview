/* eslint-disable no-unused-expressions */
import * as constants from '../constants';
import PreviewUI from '../PreviewUI';
import { getIconFromExtension } from '../icons/icons';

const sandbox = sinon.createSandbox();
let ui;

describe('lib/PreviewUI', () => {
    let containerEl;
    let options;

    /* eslint-disable require-jsdoc */
    const handler = () => {};
    /* eslint-enable require-jsdoc */

    beforeEach(() => {
        ui = new PreviewUI();
        fixture.load('__tests__/PreviewUI-test.html');
        containerEl = document.querySelector('.ui');
        options = {
            container: containerEl,
            showLoading: true,
            showProgress: true,
        };
    });

    afterEach(() => {
        fixture.cleanup();
        sandbox.verifyAndRestore();
    });

    describe('cleanup()', () => {
        test('should destroy progress bar, clean up shell, and remove event listeners', () => {
            const resultEl = ui.setup(options, handler, null, null, handler);

            jest.spyOn(ui.progressBar, 'destroy');
            const contentContainerEl = containerEl.querySelector(constants.SELECTOR_BOX_PREVIEW);
            sandbox
                .mock(contentContainerEl)
                .expects('removeEventListener')
                .withArgs('mousemove', handler);
            sandbox
                .mock(document)
                .expects('removeEventListener')
                .withArgs('keydown', handler);

            ui.cleanup();

            expect(ui.progressBar.destroy).toBeCalled();
            expect(resultEl).toBeEmptyDOMElement();
        });
    });

    describe('setup()', () => {
        test('should setup shell structure, header, progress bar, and loading state', () => {
            const resultEl = ui.setup(options);

            expect(resultEl).toBe(containerEl.querySelector(constants.SELECTOR_BOX_PREVIEW_CONTAINER));
            expect(resultEl).toContainSelector(constants.SELECTOR_BOX_PREVIEW_HEADER);
            expect(resultEl).toContainSelector(constants.SELECTOR_BOX_PREVIEW_PROGRESS_BAR);

            // Check loading state
            const loadingWrapperEl = resultEl.querySelector(constants.SELECTOR_BOX_PREVIEW_LOADING_WRAPPER);
            expect(loadingWrapperEl).toContainSelector(constants.SELECTOR_BOX_PREVIEW_ICON);
            expect(loadingWrapperEl).toContainHTML('Loading Preview...');
            expect(loadingWrapperEl).toContainHTML('Download File');
        });

        test('should not setup the progress bar or loading state if their respective option is false', () => {
            const resultEl = ui.setup({ container: containerEl, showLoading: false, showProgress: false });
            expect(resultEl).not.toContainSelector(constants.SELECTOR_BOX_PREVIEW_PROGRESS_BAR);

            // Check loading state
            expect(resultEl).not.toContainSelector(constants.SELECTOR_BOX_PREVIEW_LOADING_WRAPPER);
            expect(resultEl).not.toContainSelector(constants.SELECTOR_BOX_PREVIEW_ICON);
            expect(resultEl).not.toContainHTML('Loading Preview...');
            expect(resultEl).not.toContainHTML('Download File');
        });

        test('should setup logo if option specifies', () => {
            const url = 'http://someurl.com/';
            options.logoUrl = url;
            const resultEl = ui.setup(options);

            // Check logo
            const defaultLogoEl = resultEl.querySelector(constants.SELECTOR_BOX_PREVIEW_LOGO_DEFAULT);
            const customLogoEl = resultEl.querySelector(constants.SELECTOR_BOX_PREVIEW_LOGO_CUSTOM);
            expect(defaultLogoEl).toHaveClass(constants.CLASS_HIDDEN);
            expect(customLogoEl).not.toHaveClass(constants.CLASS_HIDDEN);
            expect(customLogoEl.src).toBe(url);
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
            test('should set up nav titles', () => {
                ui.showNavigation('1', ['1']);

                const leftNavEl = containerEl.querySelector(constants.SELECTOR_NAVIGATION_LEFT);
                const rightNavEl = containerEl.querySelector(constants.SELECTOR_NAVIGATION_RIGHT);
                expect(leftNavEl.title).toBe('Previous file');
                expect(rightNavEl.title).toBe('Next file');
            });

            test('should remove nav event listeners if collection only has one file', () => {
                const leftNavEl = containerEl.querySelector(constants.SELECTOR_NAVIGATION_LEFT);
                const rightNavEl = containerEl.querySelector(constants.SELECTOR_NAVIGATION_RIGHT);
                sandbox
                    .mock(leftNavEl)
                    .expects('removeEventListener')
                    .withArgs('click');
                sandbox
                    .mock(rightNavEl)
                    .expects('removeEventListener')
                    .withArgs('click');

                ui.showNavigation('1', ['1']);
            });

            test('should reset nav event listeners if collection has more than one file', () => {
                const leftNavEl = containerEl.querySelector(constants.SELECTOR_NAVIGATION_LEFT);
                const rightNavEl = containerEl.querySelector(constants.SELECTOR_NAVIGATION_RIGHT);
                sandbox
                    .mock(leftNavEl)
                    .expects('removeEventListener')
                    .withArgs('click');
                sandbox
                    .mock(rightNavEl)
                    .expects('removeEventListener')
                    .withArgs('click');

                ui.showNavigation('1', ['1', '2']);
            });

            test('should show left nav arrow if passed in ID is not the first in the collection', () => {
                const leftNavEl = containerEl.querySelector(constants.SELECTOR_NAVIGATION_LEFT);
                sandbox
                    .mock(leftNavEl)
                    .expects('removeEventListener')
                    .withArgs('click');
                sandbox
                    .mock(leftNavEl.classList)
                    .expects('remove')
                    .withArgs(constants.CLASS_HIDDEN);

                ui.showNavigation('2', ['1', '2']);
            });

            test('should show right nav arrow if passed in ID is not the last in the collection', () => {
                const rightNavEl = containerEl.querySelector(constants.SELECTOR_NAVIGATION_RIGHT);
                sandbox
                    .mock(rightNavEl)
                    .expects('addEventListener')
                    .withArgs('click');
                sandbox
                    .mock(rightNavEl.classList)
                    .expects('remove')
                    .withArgs(constants.CLASS_HIDDEN);

                ui.showNavigation('1', ['1', '2']);
            });

            test('should add a class if navigation is present', () => {
                const { previewContainer } = ui;
                ui.showNavigation('1', ['1']);
                let isShowingNavigation = previewContainer.classList.contains(
                    constants.CLASS_BOX_PREVIEW_HAS_NAVIGATION,
                );
                expect(isShowingNavigation).toBe(false);
                ui.showNavigation('1', ['1', '2']);
                isShowingNavigation = previewContainer.classList.contains(constants.CLASS_BOX_PREVIEW_HAS_NAVIGATION);
                expect(isShowingNavigation).toBe(true);
                ui.showNavigation('1', ['1']);
                isShowingNavigation = previewContainer.classList.contains(constants.CLASS_BOX_PREVIEW_HAS_NAVIGATION);
                expect(isShowingNavigation).toBe(false);
            });
        });

        describe('showPrintButton()', () => {
            test('should set up and show print button', () => {
                const buttonEl = containerEl.querySelector(constants.SELECTOR_BOX_PREVIEW_BTN_PRINT);
                buttonEl.classList.add(constants.CLASS_HIDDEN);
                sandbox
                    .mock(buttonEl)
                    .expects('addEventListener')
                    .withArgs('click', handler);

                ui.showPrintButton(handler);

                expect(buttonEl.title).toBe('Print');
                expect(buttonEl.classList.contains(constants.CLASS_HIDDEN)).toBe(false);
            });
        });

        describe('showDownloadButton()', () => {
            test('should set up and show download button', () => {
                const buttonEl = containerEl.querySelector(constants.SELECTOR_BOX_PREVIEW_BTN_DOWNLOAD);
                buttonEl.classList.add(constants.CLASS_HIDDEN);
                sandbox
                    .mock(buttonEl)
                    .expects('addEventListener')
                    .withArgs('click', handler);

                ui.showDownloadButton(handler);

                expect(buttonEl.title).toBe('Download');
                expect(buttonEl.classList.contains(constants.CLASS_HIDDEN)).toBe(false);
            });
        });

        describe('showLoadingDownloadButton()', () => {
            test('should set up and show loading download button', () => {
                const buttonEl = containerEl.querySelector(constants.SELECTOR_BOX_PREVIEW_BTN_LOADING_DOWNLOAD);
                buttonEl.classList.add(constants.CLASS_INVISIBLE);
                sandbox
                    .mock(buttonEl)
                    .expects('addEventListener')
                    .withArgs('click', handler);

                ui.showLoadingDownloadButton(handler);

                expect(buttonEl.title).toBe('Download');
                expect(buttonEl.classList.contains(constants.CLASS_INVISIBLE)).toBe(false);
            });
        });

        describe('showLoadingIndicator()', () => {
            test('should show loading indicator', () => {
                const contentContainerEl = containerEl.querySelector(constants.SELECTOR_BOX_PREVIEW);
                contentContainerEl.classList.add(constants.CLASS_PREVIEW_LOADED);

                ui.showLoadingIndicator();

                expect(contentContainerEl).not.toHaveClass(constants.CLASS_PREVIEW_LOADED);
            });
        });

        describe('hideLoadingIndicator()', () => {
            beforeEach(() => {
                jest.spyOn(ui, 'showCrawler');
            });

            test('should hide loading indicator', () => {
                const contentContainerEl = containerEl.querySelector(constants.SELECTOR_BOX_PREVIEW);
                ui.hideLoadingIndicator();
                expect(contentContainerEl).toHaveClass(constants.CLASS_PREVIEW_LOADED);
            });

            test('should show the crawler', () => {
                ui.hideLoadingIndicator();
                expect(ui.showCrawler).toBeCalled();
            });
        });

        describe('showCrawler()', () => {
            test('should remove the hidden class from the crawler', () => {
                const crawlerEl = containerEl.querySelector(constants.SELECTOR_BOX_PREVIEW_CRAWLER_WRAPPER);
                ui.showCrawler();
                expect(crawlerEl).not.toHaveClass(constants.CLASS_HIDDEN);
            });
        });

        describe('hideCrawler()', () => {
            test('should add the hidden class to the crawler', () => {
                const crawlerEl = containerEl.querySelector(constants.SELECTOR_BOX_PREVIEW_CRAWLER_WRAPPER);
                ui.hideCrawler();
                expect(crawlerEl).toHaveClass(constants.CLASS_HIDDEN);
            });
        });

        describe('setupNotification()', () => {
            test('should set up the notification', () => {
                ui.setupNotification();
                expect(containerEl).toContainSelector(constants.SELECTOR_BOX_PREVIEW_NOTIFICATION);
            });
        });
    });

    describe('setLoadingIcon()', () => {
        test('should hide the crawler and set the file icon into the icon element', () => {
            const iconEl = document.createElement('div');
            iconEl.innerHTML = getIconFromExtension('pdf');

            ui.setup(options);
            ui.setLoadingIcon('pdf');

            expect(containerEl.querySelector(constants.SELECTOR_BOX_PREVIEW_ICON).innerHTML).toEqual(iconEl.innerHTML);
        });
    });

    describe('startProgressBar()', () => {
        test('should start the progress bar', () => {
            ui.progressBar = {
                start: jest.fn(),
            };

            ui.startProgressBar();
            expect(ui.progressBar.start).toBeCalled();
        });
    });

    describe('finishProgressBar()', () => {
        test('should finish the progress bar', () => {
            ui.progressBar = {
                finish: jest.fn(),
            };

            ui.finishProgressBar();
            expect(ui.progressBar.finish).toBeCalled();
        });
    });

    describe('showNotification()', () => {
        test('should show a notification message', () => {
            ui.notification = {
                show: jest.fn(),
            };

            ui.showNotification('message');
            expect(ui.notification.show).toBeCalled();
        });
    });

    describe('hideNotification()', () => {
        test('should hide the notification message', () => {
            ui.notification = {
                hide: jest.fn(),
            };

            ui.hideNotification('message');
            expect(ui.notification.hide).toBeCalled();
        });
    });

    describe('replaceHeader()', () => {
        const newHeader = document.createElement('div');

        beforeEach(() => {
            containerEl = ui.setup(options);
            newHeader.className = 'bp-header bp-draw-header bp-is-hidden';
            containerEl.appendChild(newHeader);
        });

        test('should do nothing if no valid header is specified', () => {
            ui.replaceHeader('.bp-invalid-header');

            const baseHeader = containerEl.querySelector('.bp-base-header');
            expect(newHeader).toHaveClass(constants.CLASS_HIDDEN);
            expect(baseHeader).not.toHaveClass(constants.CLASS_HIDDEN);
        });

        test('should hide all headers and then show the specified header', () => {
            ui.replaceHeader('.bp-draw-header');

            const baseHeader = containerEl.querySelector('.bp-base-header');
            expect(newHeader).not.toHaveClass(constants.CLASS_HIDDEN);
            expect(baseHeader).toHaveClass(constants.CLASS_HIDDEN);
        });
    });

    describe('setupHeader()', () => {
        beforeEach(() => {
            containerEl = ui.setup(options);
        });

        afterEach(() => {
            ui.cleanup();
        });

        test('should show the header container and default header', () => {
            const headerContainerEl = containerEl.querySelector(constants.SELECTOR_BOX_PREVIEW_HEADER_CONTAINER);
            headerContainerEl.classList.add(constants.CLASS_HIDDEN);

            ui.setupHeader();

            const uiHeaderContainerEl = ui.container.querySelector(constants.SELECTOR_BOX_PREVIEW_HEADER_CONTAINER);
            expect(uiHeaderContainerEl).not.toHaveClass(constants.CLASS_HIDDEN);
            const baseHeaderEl = uiHeaderContainerEl.firstElementChild;
            expect(baseHeaderEl).toHaveClass(constants.CLASS_BOX_PREVIEW_HEADER);
            expect(baseHeaderEl).toHaveClass(constants.CLASS_BOX_PREVIEW_BASE_HEADER);
        });

        test('should set the header theme to dark', () => {
            expect(containerEl).not.toHaveClass(constants.CLASS_BOX_PREVIEW_THEME_DARK);

            ui.setupHeader('dark');

            expect(containerEl).toHaveClass(constants.CLASS_BOX_PREVIEW_THEME_DARK);
        });

        test('should override the logo url if specified', () => {
            const url = 'http://test/foo';

            expect(containerEl.querySelector(constants.SELECTOR_BOX_PREVIEW_LOGO_DEFAULT)).not.toHaveClass(
                constants.CLASS_HIDDEN,
            );

            ui.setupHeader('', url);

            const customLogoEl = containerEl.querySelector(constants.SELECTOR_BOX_PREVIEW_LOGO_CUSTOM);
            expect(containerEl.querySelector(constants.SELECTOR_BOX_PREVIEW_LOGO_DEFAULT)).toHaveClass(
                constants.CLASS_HIDDEN,
            );
            expect(customLogoEl).not.toHaveClass(constants.CLASS_HIDDEN);
            expect(customLogoEl.src).toBe(url);
        });
    });

    describe('isSetup()', () => {
        test('should return false if container is falsy', () => {
            ui.container = false;
            expect(ui.isSetup()).toBe(false);
        });

        test('should return false if container innerHTML is empty', () => {
            ui.container = { innerHTML: '' };
            expect(ui.isSetup()).toBe(false);
        });

        test('should return true if container innerHTML is not empty', () => {
            ui.container = { innerHTML: 'foo' };
            expect(ui.isSetup()).toBe(true);
        });
    });
});
