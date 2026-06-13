import React from 'react';
import { render, screen } from '@testing-library/react';
import VideoGuidesOverlay from '../VideoGuidesOverlay';
import { Guide } from '../MediaSettingsMenuGuides';

class MockResizeObserver {
    observe = jest.fn();

    disconnect = jest.fn();

    unobserve = jest.fn();
}

describe('VideoGuidesOverlay', () => {
    beforeAll(() => {
        ((global as unknown) as { ResizeObserver: typeof MockResizeObserver }).ResizeObserver = MockResizeObserver;
    });

    const makeVideo = ({ videoWidth = 1920, videoHeight = 1080 } = {}): HTMLVideoElement => {
        const el = document.createElement('video');
        Object.defineProperty(el, 'videoWidth', { configurable: true, value: videoWidth });
        Object.defineProperty(el, 'videoHeight', { configurable: true, value: videoHeight });
        // getBoundingClientRect must return a non-zero box so the overlay positions itself.
        Object.defineProperty(el, 'getBoundingClientRect', {
            configurable: true,
            value: () => ({ top: 0, left: 0, width: 1600, height: 900, bottom: 900, right: 1600, x: 0, y: 0 }),
        });
        return el as HTMLVideoElement;
    };

    test('renders an empty overlay when guide is Off', () => {
        render(<VideoGuidesOverlay guide={Guide.OFF} isMaskEnabled={false} mediaEl={makeVideo()} />);
        const overlay = screen.getByTestId('bp-VideoGuidesOverlay');
        expect(overlay).toBeEmptyDOMElement();
    });

    test('renders frame and action-safe rects when a guide is selected', () => {
        render(<VideoGuidesOverlay guide={Guide.R_16_9} isMaskEnabled={false} mediaEl={makeVideo()} />);
        expect(screen.getByTestId('bp-VideoGuidesOverlay-frame')).toBeInTheDocument();
        expect(screen.getByTestId('bp-VideoGuidesOverlay-action-safe')).toBeInTheDocument();
    });

    test('frame fills the viewBox when guide aspect matches video aspect', () => {
        // 16:9 video (1920x1080), 16:9 guide → frame fills entire viewBox
        render(<VideoGuidesOverlay guide={Guide.R_16_9} isMaskEnabled={false} mediaEl={makeVideo()} />);
        const frame = screen.getByTestId('bp-VideoGuidesOverlay-frame');
        expect(frame).toHaveAttribute('width', '1920');
        expect(frame).toHaveAttribute('height', '1080');
        expect(frame).toHaveAttribute('x', '0');
        expect(frame).toHaveAttribute('y', '0');
    });

    test('fits a 1:1 guide inside a 16:9 video viewBox (height-bound, centered)', () => {
        render(<VideoGuidesOverlay guide={Guide.R_1_1} isMaskEnabled={false} mediaEl={makeVideo()} />);
        const frame = screen.getByTestId('bp-VideoGuidesOverlay-frame');
        // 1:1 guide in 1920x1080 viewBox → 1080x1080, centered horizontally
        expect(frame).toHaveAttribute('width', '1080');
        expect(frame).toHaveAttribute('height', '1080');
        expect(frame).toHaveAttribute('x', '420'); // (1920 - 1080) / 2
        expect(frame).toHaveAttribute('y', '0');
    });

    test('renders the mask rect when mask is enabled', () => {
        render(<VideoGuidesOverlay guide={Guide.R_1_1} isMaskEnabled mediaEl={makeVideo()} />);
        expect(screen.getByTestId('bp-VideoGuidesOverlay-mask')).toBeInTheDocument();
    });

    test('does not render the mask rect when mask is disabled', () => {
        render(<VideoGuidesOverlay guide={Guide.R_1_1} isMaskEnabled={false} mediaEl={makeVideo()} />);
        expect(screen.queryByTestId('bp-VideoGuidesOverlay-mask')).not.toBeInTheDocument();
    });

    test('action-safe rect is inset 93% relative to the frame', () => {
        render(<VideoGuidesOverlay guide={Guide.R_16_9} isMaskEnabled={false} mediaEl={makeVideo()} />);
        const safe = screen.getByTestId('bp-VideoGuidesOverlay-action-safe');
        // 93% of 1920x1080 frame
        expect(safe).toHaveAttribute('width', `${1920 * 0.93}`);
        expect(safe).toHaveAttribute('height', `${1080 * 0.93}`);
    });
});
