import { act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as constants from '../constants';
import LoadingIcon from '../LoadingIcon';
import PreviewUI from '../PreviewUI';
import { CollectionNavigationRoot } from '../CollectionNavigation';
import { NotificationsV2Root } from '../NotificationsV2';

jest.mock('../LoadingIcon');

describe('lib/PreviewUI', () => {
    const supportingUiFeatures = { blueprintMigrationSupportingUi: { enabled: true } };
    const keydown = jest.fn();
    const mousemove = jest.fn();
    const navigateLeft = jest.fn();
    const navigateRight = jest.fn();

    let containerEl: HTMLElement;
    let ui: PreviewUI;

    const setup = (options: Record<string, unknown> = {}): HTMLElement =>
        ui.setup(
            { container: containerEl, showLoading: true, ...options },
            keydown,
            navigateLeft,
            navigateRight,
            mousemove,
        );
    const showNavigation = (id: string, collection: string[]): void => act(() => ui.showNavigation(id, collection));
    const queryPrevious = (): HTMLElement | null =>
        within(containerEl).queryByRole('button', { name: __('previous_file') });
    const queryNext = (): HTMLElement | null => within(containerEl).queryByRole('button', { name: __('next_file') });

    beforeEach(() => {
        jest.clearAllMocks();
        containerEl = document.createElement('div');
        document.body.appendChild(containerEl);
        ui = new PreviewUI();
    });

    afterEach(() => {
        act(() => ui.cleanup());
        containerEl.remove();
    });

    describe('setup()', () => {
        test('should insert the shell with a labelled logo and loading state', () => {
            const resultEl = setup();

            expect(resultEl).toBe(containerEl.querySelector(constants.SELECTOR_BOX_PREVIEW_CONTAINER));
            expect(within(resultEl).getByLabelText(__('logo'))).not.toHaveClass(constants.CLASS_HIDDEN);
            expect(resultEl.querySelector(constants.SELECTOR_BOX_PREVIEW_ICON)).toBeInTheDocument();
        });

        test('should not set up the loading state if showLoading is false', () => {
            const resultEl = setup({ showLoading: false });

            expect(resultEl.querySelector(constants.SELECTOR_BOX_PREVIEW_ICON)).not.toBeInTheDocument();
        });

        test('should show the custom logo if logoUrl is set', () => {
            const url = 'http://someurl.com/';

            const resultEl = setup({ logoUrl: url });

            expect(within(resultEl).getByLabelText(__('logo'))).toHaveClass(constants.CLASS_HIDDEN);
            expect(within(resultEl).getByAltText(__('logo'))).not.toHaveClass(constants.CLASS_HIDDEN);
            expect(within(resultEl).getByAltText(__('logo'))).toHaveAttribute('src', url);
        });

        test('should listen for keydown on the document', async () => {
            setup();

            await userEvent.keyboard('a');

            expect(keydown).toBeCalledTimes(1);
        });

        test('should keep the legacy navigation arrows when the supporting UI flag is off', () => {
            setup();
            showNavigation('2', ['1', '2', '3']);

            expect(ui.collectionNavigation).toBeUndefined();
            expect(queryPrevious()).toHaveClass('bp-navigate-left');
            expect(queryNext()).toHaveClass('bp-navigate-right');
        });

        test('should replace the legacy navigation arrows with Blueprint arrows when the supporting UI flag is on', () => {
            const resultEl = setup({ features: supportingUiFeatures });

            expect(resultEl.querySelector(constants.SELECTOR_NAVIGATION_LEFT)).not.toBeInTheDocument();
            expect(resultEl.querySelector(constants.SELECTOR_NAVIGATION_RIGHT)).not.toBeInTheDocument();
            expect(ui.collectionNavigation).toBeInstanceOf(CollectionNavigationRoot);
            expect(resultEl.querySelector(constants.SELECTOR_BOX_PREVIEW_CONTENT)).toContainElement(
                ui.collectionNavigation.hostEl,
            );
        });
    });

    describe('cleanup()', () => {
        test('should empty the shell and stop listening for keyboard and mouse events', async () => {
            setup();
            showNavigation('1', ['1', '2']);
            const { previewContainer } = ui;

            ui.cleanup();
            await userEvent.keyboard('a');
            await userEvent.hover(previewContainer);

            expect(ui.container).toBeEmptyDOMElement();
            expect(keydown).not.toBeCalled();
            expect(mousemove).not.toBeCalled();
        });
    });

    describe('showNavigation()', () => {
        beforeEach(() => {
            setup();
        });

        test('should title the arrows', () => {
            showNavigation('1', ['1']);

            expect(queryPrevious()).toBeInTheDocument();
            expect(queryNext()).toBeInTheDocument();
        });

        test('should hide both arrows and skip navigation if the collection only has one file', async () => {
            showNavigation('1', ['1']);

            await userEvent.click(queryPrevious() as HTMLElement);
            await userEvent.click(queryNext() as HTMLElement);
            await userEvent.hover(ui.previewContainer);

            expect(queryPrevious()).toHaveClass(constants.CLASS_HIDDEN);
            expect(queryNext()).toHaveClass(constants.CLASS_HIDDEN);
            expect(navigateLeft).not.toBeCalled();
            expect(navigateRight).not.toBeCalled();
            expect(mousemove).not.toBeCalled();
            expect(ui.previewContainer).not.toHaveClass(constants.CLASS_BOX_PREVIEW_HAS_NAVIGATION);
        });

        test.each`
            id     | hasPrevious | hasNext
            ${'1'} | ${false}    | ${true}
            ${'2'} | ${true}     | ${true}
            ${'3'} | ${true}     | ${false}
        `(
            'should show previous arrow: $hasPrevious, next arrow: $hasNext for file $id of 3',
            async ({ id, hasNext, hasPrevious }) => {
                showNavigation(id, ['1', '2', '3']);

                await userEvent.click(queryPrevious() as HTMLElement);
                await userEvent.click(queryNext() as HTMLElement);

                expect(queryPrevious()?.classList.contains(constants.CLASS_HIDDEN)).toBe(!hasPrevious);
                expect(queryNext()?.classList.contains(constants.CLASS_HIDDEN)).toBe(!hasNext);
                expect(navigateLeft).toBeCalledTimes(hasPrevious ? 1 : 0);
                expect(navigateRight).toBeCalledTimes(hasNext ? 1 : 0);
                expect(ui.previewContainer).toHaveClass(constants.CLASS_BOX_PREVIEW_HAS_NAVIGATION);
            },
        );

        test('should track mousemove while the collection has more than one file', async () => {
            showNavigation('1', ['1', '2']);

            await userEvent.hover(ui.previewContainer);

            expect(mousemove).toBeCalledTimes(1);
        });

        test('should stop navigating when the collection shrinks to one file', async () => {
            showNavigation('1', ['1', '2']);
            showNavigation('1', ['1']);

            await userEvent.click(queryNext() as HTMLElement);
            await userEvent.hover(ui.previewContainer);

            expect(queryNext()).toHaveClass(constants.CLASS_HIDDEN);
            expect(navigateRight).not.toBeCalled();
            expect(mousemove).not.toBeCalled();
            expect(ui.previewContainer).not.toHaveClass(constants.CLASS_BOX_PREVIEW_HAS_NAVIGATION);
        });
    });

    describe('showNavigation() with the supporting UI flag on', () => {
        beforeEach(() => {
            setup({ features: supportingUiFeatures });
        });

        test('should not show arrows or the has-navigation class if the collection only has one file', () => {
            showNavigation('1', ['1']);

            expect(queryPrevious()).not.toBeInTheDocument();
            expect(queryNext()).not.toBeInTheDocument();
            expect(ui.previewContainer).not.toHaveClass(constants.CLASS_BOX_PREVIEW_HAS_NAVIGATION);
        });

        test.each`
            id     | hasPrevious | hasNext
            ${'1'} | ${false}    | ${true}
            ${'2'} | ${true}     | ${true}
            ${'3'} | ${true}     | ${false}
        `(
            'should show previous arrow: $hasPrevious, next arrow: $hasNext for file $id of 3',
            ({ id, hasNext, hasPrevious }) => {
                showNavigation(id, ['1', '2', '3']);

                expect(!!queryPrevious()).toBe(hasPrevious);
                expect(!!queryNext()).toBe(hasNext);
                expect(ui.previewContainer).toHaveClass(constants.CLASS_BOX_PREVIEW_HAS_NAVIGATION);
            },
        );

        test('should navigate through the preview handlers when the arrows are clicked', async () => {
            showNavigation('2', ['1', '2', '3']);

            await userEvent.click(queryPrevious() as HTMLElement);
            expect(navigateLeft).toBeCalledTimes(1);

            await userEvent.click(queryNext() as HTMLElement);
            expect(navigateRight).toBeCalledTimes(1);
        });

        test('should navigate with a tooltip open while the viewer clears the content container', async () => {
            showNavigation('2', ['1', '2', '3']);

            act(() => queryPrevious()?.focus());
            expect(await within(ui.contentContainer).findByRole('tooltip')).toHaveTextContent(__('previous_file'));

            navigateLeft.mockImplementationOnce(() => {
                ui.contentContainer.innerHTML = '';
            });

            await userEvent.keyboard('{Enter}');
            expect(navigateLeft).toBeCalledTimes(1);
            expect(() => act(() => ui.cleanup())).not.toThrow();
        });

        test('should track mousemove only while the collection has more than one file', async () => {
            showNavigation('1', ['1', '2']);
            await userEvent.hover(ui.previewContainer);
            expect(mousemove).toBeCalledTimes(1);

            showNavigation('1', ['1']);
            await userEvent.unhover(ui.previewContainer);
            await userEvent.hover(ui.previewContainer);
            expect(mousemove).toBeCalledTimes(1);
        });

        test('should hide the arrows again when the collection shrinks to one file', () => {
            showNavigation('1', ['1', '2']);
            expect(queryNext()).toBeInTheDocument();

            showNavigation('1', ['1']);

            expect(queryNext()).not.toBeInTheDocument();
            expect(ui.previewContainer).not.toHaveClass(constants.CLASS_BOX_PREVIEW_HAS_NAVIGATION);
        });

        test('should destroy the Blueprint arrows on cleanup', () => {
            const { collectionNavigation } = ui;
            jest.spyOn(collectionNavigation, 'destroy');

            act(() => ui.cleanup());

            expect(collectionNavigation.destroy).toBeCalled();
            expect(ui.collectionNavigation).toBeNull();
        });
    });

    describe('showPrintButton()', () => {
        test('should show a titled print button that calls the handler', async () => {
            const handler = jest.fn();
            const resultEl = setup();

            ui.showPrintButton(handler);
            const printButton = within(resultEl).getByRole('button', { name: __('print') });
            await userEvent.click(printButton);

            expect(printButton).not.toHaveClass(constants.CLASS_HIDDEN);
            expect(handler).toBeCalledTimes(1);
        });
    });

    describe('showLoadingIndicator()', () => {
        test('should remove the loaded class from the preview container', () => {
            setup();
            ui.previewContainer.classList.add(constants.CLASS_PREVIEW_LOADED);

            ui.showLoadingIndicator();

            expect(ui.previewContainer).not.toHaveClass(constants.CLASS_PREVIEW_LOADED);
        });
    });

    describe('hideLoadingIndicator()', () => {
        test('should add the loaded class to the preview container', () => {
            setup();

            ui.hideLoadingIndicator();

            expect(ui.previewContainer).toHaveClass(constants.CLASS_PREVIEW_LOADED);
        });
    });

    describe('showLoadingIcon()', () => {
        test('should render the loading icon based on the file extension', () => {
            const resultEl = setup();

            ui.showLoadingIcon('pdf');

            expect(LoadingIcon).toBeCalledWith({
                containerEl: resultEl.querySelector(constants.SELECTOR_BOX_PREVIEW_ICON),
            });
            expect(jest.mocked(LoadingIcon).mock.instances[0].render).toBeCalledWith('pdf');
        });
    });

    describe('notifications', () => {
        test('should show and hide a notification message', () => {
            setup();
            ui.setupNotification();

            ui.showNotification('message', undefined, true);
            const notification = within(ui.contentContainer).getByRole('alert');
            expect(notification).toHaveTextContent('message');
            expect(notification).not.toHaveClass(constants.CLASS_HIDDEN);

            ui.hideNotification();
            expect(notification).toHaveClass(constants.CLASS_HIDDEN);
        });

        test('should show Blueprint notifications with the supporting UI flag', () => {
            setup({ features: supportingUiFeatures });
            act(() => ui.setupNotification(supportingUiFeatures));

            expect(ui.notification).toBeInstanceOf(NotificationsV2Root);

            act(() => ui.showNotification('message', null, false, 'error'));
            expect(within(ui.contentContainer).getByText('message')).toBeInTheDocument();
            expect(within(ui.contentContainer).getByLabelText(__('notification_icon_error'))).toBeInTheDocument();

            act(() => ui.hideNotification());
            expect(within(ui.contentContainer).queryByText('message')).not.toBeInTheDocument();
        });

        test('should destroy the previous notification when set up again and on cleanup', () => {
            setup({ features: supportingUiFeatures });
            act(() => ui.setupNotification(supportingUiFeatures));
            const first = ui.notification as NotificationsV2Root;
            jest.spyOn(first, 'destroy');

            act(() => ui.setupNotification(supportingUiFeatures));
            expect(first.destroy).toBeCalled();

            const second = ui.notification as NotificationsV2Root;
            jest.spyOn(second, 'destroy');
            act(() => ui.cleanup());
            expect(second.destroy).toBeCalled();
            expect(ui.notification).toBeNull();
        });

        test('should leave the legacy notification as is on cleanup', () => {
            setup();
            ui.setupNotification();
            const { notification } = ui;

            ui.cleanup();

            expect(ui.notification).toBe(notification);
        });

        test('should ignore show and hide before the notification is set up', () => {
            setup();

            expect(() => ui.showNotification('message')).not.toThrow();
            expect(() => ui.hideNotification()).not.toThrow();
            expect(within(ui.contentContainer).queryByRole('alert')).not.toBeInTheDocument();
        });
    });

    describe('replaceHeader()', () => {
        let newHeader: HTMLElement;

        beforeEach(() => {
            const resultEl = setup();
            newHeader = document.createElement('div');
            newHeader.className = 'bp-header bp-draw-header bp-is-hidden';
            resultEl.appendChild(newHeader);
        });

        test('should do nothing if no valid header is specified', () => {
            ui.replaceHeader('.bp-invalid-header');

            expect(newHeader).toHaveClass(constants.CLASS_HIDDEN);
            expect(ui.container.querySelector('.bp-base-header')).not.toHaveClass(constants.CLASS_HIDDEN);
        });

        test('should hide all headers and then show the specified header', () => {
            ui.replaceHeader('.bp-draw-header');

            expect(newHeader).not.toHaveClass(constants.CLASS_HIDDEN);
            expect(ui.container.querySelector('.bp-base-header')).toHaveClass(constants.CLASS_HIDDEN);
        });
    });

    describe('header option', () => {
        test('should show the base header in the light theme by default', () => {
            const resultEl = setup();
            const headerContainerEl = resultEl.querySelector(constants.SELECTOR_BOX_PREVIEW_HEADER_CONTAINER);

            expect(headerContainerEl).not.toHaveClass(constants.CLASS_HIDDEN);
            expect(headerContainerEl?.firstElementChild).toHaveClass(
                constants.CLASS_BOX_PREVIEW_HEADER,
                constants.CLASS_BOX_PREVIEW_BASE_HEADER,
            );
            expect(ui.previewContainer).toHaveClass(constants.CLASS_BOX_PREVIEW_HAS_HEADER);
            expect(resultEl).not.toHaveClass(constants.CLASS_BOX_PREVIEW_THEME_DARK);
        });

        test('should set the header theme to dark', () => {
            const resultEl = setup({ header: 'dark' });

            expect(resultEl).toHaveClass(constants.CLASS_BOX_PREVIEW_THEME_DARK);
        });

        test('should leave the header hidden if header is none', () => {
            const resultEl = setup({ header: 'none' });

            expect(resultEl.querySelector(constants.SELECTOR_BOX_PREVIEW_HEADER_CONTAINER)).toHaveClass(
                constants.CLASS_HIDDEN,
            );
            expect(ui.previewContainer).not.toHaveClass(constants.CLASS_BOX_PREVIEW_HAS_HEADER);
        });
    });

    describe('isSetup()', () => {
        test('should return falsy before setup', () => {
            expect(ui.isSetup()).toBeFalsy();
        });

        test('should return true after setup', () => {
            setup();

            expect(ui.isSetup()).toBe(true);
        });

        test('should return false after cleanup', () => {
            setup();

            ui.cleanup();

            expect(ui.isSetup()).toBe(false);
        });
    });
});
