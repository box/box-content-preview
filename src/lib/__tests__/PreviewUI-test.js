/* eslint-disable no-unused-expressions */
import * as constants from '../constants';
import LoadingIcon from '../LoadingIcon';
import PreviewUI from '../PreviewUI';

jest.mock('../LoadingIcon');

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
        };
    });

    afterEach(() => {
        fixture.cleanup();
        sandbox.verifyAndRestore();
    });

    describe('cleanup()', () => {
        test('should clean up shell and remove event listeners', () => {
            const resultEl = ui.setup(options, handler, null, null, handler);

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

            expect(resultEl).toBeEmptyDOMElement();
        });
    });

    describe('setup()', () => {
        test('should setup shell structure, header, and loading state', () => {
            const resultEl = ui.setup(options);

            expect(resultEl).toBe(containerEl.querySelector(constants.SELECTOR_BOX_PREVIEW_CONTAINER));
            expect(resultEl).toContainSelector(constants.SELECTOR_BOX_PREVIEW_HEADER);

            // Check loading state
            expect(resultEl).toContainSelector(constants.SELECTOR_BOX_PREVIEW_ICON);
        });

        test('should not setup the loading state if their respective option is false', () => {
            const resultEl = ui.setup({ container: containerEl, showLoading: false });
            expect(resultEl).not.toContainSelector(constants.SELECTOR_BOX_PREVIEW_ICON);
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

        describe('showLoadingIndicator()', () => {
            test('should update the container classes', () => {
                const contentContainerEl = containerEl.querySelector(constants.SELECTOR_BOX_PREVIEW);
                contentContainerEl.classList.add(constants.CLASS_PREVIEW_LOADED);

                ui.showLoadingIndicator();

                expect(contentContainerEl).not.toHaveClass(constants.CLASS_PREVIEW_LOADED);
            });
        });

        describe('hideLoadingIndicator()', () => {
            test('should update the container classes', () => {
                const contentContainerEl = containerEl.querySelector(constants.SELECTOR_BOX_PREVIEW);
                ui.hideLoadingIndicator();
                expect(contentContainerEl).toHaveClass(constants.CLASS_PREVIEW_LOADED);
            });
        });

        describe('setupNotification()', () => {
            test('should set up the notification', () => {
                ui.setupNotification();
                expect(containerEl).toContainSelector(constants.SELECTOR_BOX_PREVIEW_NOTIFICATION);
            });
        });
    });

    describe('showLoadingIcon()', () => {
        test('should render the loading icon based on the file extension', () => {
            ui.setup(options);
            ui.showLoadingIcon('pdf');

            expect(ui.loadingIcon).toBeInstanceOf(LoadingIcon);
            expect(ui.loadingIcon.render).toBeCalledWith('pdf');
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
