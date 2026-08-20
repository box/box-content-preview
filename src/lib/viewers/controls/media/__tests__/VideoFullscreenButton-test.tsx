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

((global as unknown) as { ResizeObserver: jest.Mock }).ResizeObserver = mockResizeObserver;

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
        const rect = (overrides: Partial<DOMRect>): DOMRect =>
            ({
                x: 0,
                y: 0,
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
                width: 0,
                height: 0,
                toJSON: () => ({}),
                ...overrides,
            } as DOMRect);

        let observerCallback: () => void;

        beforeEach(() => {
            mockResizeObserver.mockImplementation((callback: () => void) => {
                observerCallback = callback;
                return {
                    observe: jest.fn(),
                    unobserve: jest.fn(),
                    disconnect: jest.fn(),
                };
            });
        });

        const renderWithPositionedParent = () => {
            const parent = document.createElement('div');
            parent.style.position = 'relative';
            document.body.appendChild(parent);

            const view = render(<VideoFullscreenButton mediaEl={mediaEl} onFullscreenToggle={jest.fn()} />, {
                container: parent,
            });

            return { parent, ...view };
        };

        test('should observe the media element for resize', () => {
            renderComponent();

            expect(mockResizeObserver).toHaveBeenCalled();
            const observerInstance = mockResizeObserver.mock.results[0].value;
            expect(observerInstance.observe).toHaveBeenCalledWith(mediaEl);
        });

        test('should observe the overlay parent so layout changes recentering the video are tracked', () => {
            const { parent } = renderWithPositionedParent();
            const observerInstance = mockResizeObserver.mock.results[0].value;

            expect(observerInstance.observe).toHaveBeenCalledWith(mediaEl);
            expect(observerInstance.observe).toHaveBeenCalledWith(parent);

            document.body.removeChild(parent);
        });

        test('should realign to the video when the parent resizes and the video is recentered', () => {
            mediaEl.getBoundingClientRect = jest.fn(() =>
                rect({ top: 100, right: 800, bottom: 500, left: 200, width: 600, height: 400 }),
            );

            const { parent } = renderWithPositionedParent();
            parent.getBoundingClientRect = jest.fn(() =>
                rect({ top: 0, right: 1000, bottom: 700, left: 0, width: 1000, height: 700 }),
            );

            act(() => {
                observerCallback();
            });

            const button = screen.getByRole('button', { name: /fullscreen/i });
            // top: 100 - 0 + 24, right: 1000 - 800 + 24
            expect(button).toHaveStyle({ top: '124px', right: '224px' });

            // Sidebar (300px) appears: parent shrinks from the right, centered video
            // only shifts left by half that amount.
            mediaEl.getBoundingClientRect = jest.fn(() =>
                rect({ top: 100, right: 650, bottom: 500, left: 50, width: 600, height: 400 }),
            );
            parent.getBoundingClientRect = jest.fn(() =>
                rect({ top: 0, right: 700, bottom: 700, left: 0, width: 700, height: 700 }),
            );

            act(() => {
                observerCallback();
            });

            // top unchanged; right: 700 - 650 + 24 — still 24px from the video's right edge
            expect(button).toHaveStyle({ top: '124px', right: '74px' });

            document.body.removeChild(parent);
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
