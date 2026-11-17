import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PrintModalRoot } from '../PrintModal';

describe('PrintModalRoot', () => {
    let containerEl: HTMLElement;
    let printModal: PrintModalRoot;

    const showLoading = (handler?: () => void): void => {
        act(() => {
            printModal.show(__('print_loading'), __('print'), handler);
            printModal.disableButton();
        });
    };

    beforeEach(() => {
        containerEl = document.createElement('div');
        document.body.appendChild(containerEl);
        printModal = new PrintModalRoot(containerEl);
    });

    afterEach(() => {
        act(() => printModal.destroy());
        containerEl.remove();
    });

    test('should render nothing until shown', () => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(printModal.isVisible()).toBe(false);
    });

    test('should show the loading message, crawler, and a disabled print button', () => {
        showLoading();

        const dialog = screen.getByRole('dialog', { name: __('print') });
        expect(dialog).toHaveTextContent(__('print_loading'));
        expect(containerEl).toContainElement(dialog);
        expect(screen.getByRole('status', { name: __('print_loading') })).toBeInTheDocument();
        expect(screen.queryByTestId('bp-PrintModal-checkmark')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: __('print') })).toBeDisabled();
        expect(printModal.isVisible()).toBe(true);
        expect(printModal.isButtonDisabled()).toBe(true);
    });

    test('should swap the crawler for the checkmark and enable printing when ready', () => {
        showLoading();

        act(() => printModal.showReady(__('print_ready')));

        expect(screen.getByRole('dialog')).toHaveTextContent(__('print_ready'));
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
        expect(screen.getByTestId('bp-PrintModal-checkmark')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: __('print') })).toBeEnabled();
        expect(printModal.isButtonDisabled()).toBe(false);
    });

    test('should reset to the loading state when shown again', () => {
        showLoading();
        act(() => printModal.showReady(__('print_ready')));

        showLoading();

        expect(screen.getByRole('status', { name: __('print_loading') })).toBeInTheDocument();
        expect(screen.queryByTestId('bp-PrintModal-checkmark')).not.toBeInTheDocument();
    });

    test('should call the print handler when the print button is clicked', async () => {
        const handler = jest.fn();
        showLoading(handler);
        act(() => printModal.showReady(__('print_ready')));

        await userEvent.click(screen.getByRole('button', { name: __('print') }));

        expect(handler).toBeCalledTimes(1);
    });

    test('should hide when the print button is clicked without a handler', async () => {
        showLoading();
        act(() => printModal.showReady(__('print_ready')));

        await userEvent.click(screen.getByRole('button', { name: __('print') }));

        expect(printModal.isVisible()).toBe(false);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('should hide when the close button is clicked', async () => {
        showLoading();

        await userEvent.click(screen.getByRole('button', { name: __('print_close') }));

        expect(printModal.isVisible()).toBe(false);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('should tag the actionable elements for analytics', () => {
        showLoading();

        expect(screen.getByRole('button', { name: __('print') })).toHaveAttribute('data-target-id', 'PrintModal-print');
        expect(screen.getByRole('button', { name: __('print_close') })).toHaveAttribute(
            'data-target-id',
            'PrintModal-close',
        );
    });

    describe('body pointer events after close', () => {
        afterEach(() => {
            document.body.style.removeProperty('pointer-events');
        });

        test('should restore body pointer events when no host layer was open', async () => {
            showLoading();
            expect(document.body.style.pointerEvents).toBe('none');

            await userEvent.click(screen.getByRole('button', { name: __('print_close') }));

            await waitFor(() => expect(document.body.style.pointerEvents).toBe(''));
        });

        test('should restore body pointer events when the host menu closed while the modal was open', async () => {
            document.body.style.pointerEvents = 'none';
            showLoading();
            document.body.style.pointerEvents = '';
            await waitFor(() => expect(printModal.releasedBodyPointerEvents).toBe(''));

            await userEvent.click(screen.getByRole('button', { name: __('print_close') }), {
                pointerEventsCheck: 0,
            });

            await waitFor(() => expect(document.body.style.pointerEvents).toBe(''));
        });

        test('should not override a host layer that opens after the modal closed', async () => {
            showLoading();
            document.body.style.pointerEvents = '';
            await waitFor(() => expect(printModal.releasedBodyPointerEvents).toBe(''));
            document.body.style.pointerEvents = 'none';

            await userEvent.click(screen.getByRole('button', { name: __('print_close') }), {
                pointerEventsCheck: 0,
            });
            await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
            document.body.style.pointerEvents = 'none';

            await act(async () => {});
            expect(document.body.style.pointerEvents).toBe('none');
        });

        test('should restore body pointer events when destroyed while open after the host menu closed', async () => {
            document.body.style.pointerEvents = 'none';
            showLoading();
            document.body.style.pointerEvents = '';
            await waitFor(() => expect(printModal.releasedBodyPointerEvents).toBe(''));

            await act(async () => printModal.destroy());

            expect(document.body.style.pointerEvents).toBe('');
            expect(printModal.isVisible()).toBe(false);
        });

        test('should restore body pointer events when a host render defers the unmount on destroy', async () => {
            document.body.style.pointerEvents = 'none';
            showLoading();
            document.body.style.pointerEvents = '';
            await waitFor(() => expect(printModal.releasedBodyPointerEvents).toBe(''));
            const unmount = printModal.root.unmount.bind(printModal.root);
            jest.spyOn(printModal.root, 'unmount').mockImplementation(() => {});

            await act(async () => {
                printModal.destroy();
                unmount();
            });

            expect(document.body.style.pointerEvents).toBe('');
        });

        test('should keep a host lock applied while the modal was open', async () => {
            document.body.style.pointerEvents = 'none';
            showLoading();
            document.body.style.pointerEvents = '';
            await waitFor(() => expect(printModal.releasedBodyPointerEvents).toBe(''));
            document.body.style.pointerEvents = 'none';
            await waitFor(() => expect(printModal.releasedBodyPointerEvents).toBeNull());

            await userEvent.click(screen.getByRole('button', { name: __('print_close') }), {
                pointerEventsCheck: 0,
            });
            await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
            await act(async () => {});

            expect(document.body.style.pointerEvents).toBe('none');
        });

        test('should leave body pointer events disabled when a host layer stays open', async () => {
            document.body.style.pointerEvents = 'none';
            showLoading();

            await userEvent.click(screen.getByRole('button', { name: __('print_close') }), {
                pointerEventsCheck: 0,
            });

            await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
            expect(document.body.style.pointerEvents).toBe('none');
        });
    });

    test('should remove its host and ignore updates after destroy', () => {
        showLoading();

        act(() => printModal.destroy());

        expect(containerEl).not.toContainElement(printModal.hostEl);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(() => printModal.showReady(__('print_ready'))).not.toThrow();
    });
});
