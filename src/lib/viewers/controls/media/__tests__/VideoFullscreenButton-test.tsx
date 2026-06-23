import React, { act } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fullscreen from '../../../../Fullscreen';
import VideoFullscreenButton from '../VideoFullscreenButton';

const mockResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
}));

(global as any).ResizeObserver = mockResizeObserver;

describe('VideoFullscreenButton', () => {
    let mediaEl: HTMLVideoElement;

    beforeEach(() => {
        mediaEl = document.createElement('video');
        document.body.appendChild(mediaEl);
    });

    afterEach(() => {
        document.body.removeChild(mediaEl);
    });

    const renderComponent = (props = {}) =>
        render(<VideoFullscreenButton mediaEl={mediaEl} onFullscreenToggle={jest.fn()} {...props} />);

    describe('render', () => {
        test('should render the fullscreen button', () => {
            renderComponent();
            expect(screen.getByRole('button', { name: /fullscreen/i })).toBeInTheDocument();
        });

        test('should render with enter fullscreen title by default', () => {
            renderComponent();
            expect(screen.getByTitle('Enter fullscreen')).toBeInTheDocument();
        });

        test('should render maximize icon when not fullscreen', () => {
            renderComponent();
            expect(screen.getByTestId('IconArrowsMaximizeMedium24')).toBeInTheDocument();
        });
    });

    describe('fullscreen state', () => {
        test('should show minimize icon and exit title when fullscreen', () => {
            renderComponent();

            act(() => {
                fullscreen.enter();
            });

            expect(screen.getByTestId('IconArrowsMinimizeMedium24')).toBeInTheDocument();
            expect(screen.getByTitle('Exit fullscreen')).toBeInTheDocument();
        });

        test('should show maximize icon and enter title when exiting fullscreen', () => {
            renderComponent();

            act(() => {
                fullscreen.enter();
            });

            act(() => {
                fullscreen.exit();
            });

            expect(screen.getByTestId('IconArrowsMaximizeMedium24')).toBeInTheDocument();
            expect(screen.getByTitle('Enter fullscreen')).toBeInTheDocument();
        });
    });

    describe('event handlers', () => {
        test('should call onFullscreenToggle with true when clicked in non-fullscreen state', async () => {
            const onToggle = jest.fn();
            renderComponent({ onFullscreenToggle: onToggle });

            const button = screen.getByRole('button', { name: /fullscreen/i });
            await userEvent.click(button);

            expect(onToggle).toHaveBeenCalledWith(true, expect.any(Object));
        });

        test('should call onFullscreenToggle with false when clicked in fullscreen state', async () => {
            const onToggle = jest.fn();
            renderComponent({ onFullscreenToggle: onToggle });

            act(() => {
                fullscreen.enter();
            });

            const button = screen.getByRole('button', { name: /fullscreen/i });
            await userEvent.click(button);

            expect(onToggle).toHaveBeenCalledWith(false, expect.any(Object));
        });
    });

    describe('positioning', () => {
        test('should observe the media element for resize', () => {
            renderComponent();

            expect(mockResizeObserver).toHaveBeenCalled();
            const observerInstance = mockResizeObserver.mock.results[0].value;
            expect(observerInstance.observe).toHaveBeenCalledWith(mediaEl);
        });

        test('should disconnect observer on unmount', () => {
            const { unmount } = renderComponent();
            const observerInstance = mockResizeObserver.mock.results[0].value;

            unmount();

            expect(observerInstance.disconnect).toHaveBeenCalled();
        });

        test('should render without position when mediaEl is not provided', () => {
            render(<VideoFullscreenButton onFullscreenToggle={jest.fn()} />);

            const button = screen.getByRole('button', { name: /fullscreen/i });
            expect(button).not.toHaveAttribute('style');
        });
    });
});
