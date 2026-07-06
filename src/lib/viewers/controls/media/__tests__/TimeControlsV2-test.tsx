import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import TimeControlsV2 from '../TimeControlsV2';
import { CommentMarker } from '../types';

const mockResizeObserver = jest.fn().mockImplementation(() => ({
    disconnect: jest.fn(),
    observe: jest.fn(),
    unobserve: jest.fn(),
}));
((global as unknown) as { ResizeObserver: jest.Mock }).ResizeObserver = mockResizeObserver;

beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 600 });
});

afterAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 0 });
});

describe('TimeControlsV2', () => {
    const defaultProps = {
        onTimeChange: jest.fn(),
    };

    describe('comment markers', () => {
        const markers: CommentMarker[] = [
            { id: 'marker-1', time: 10, type: 'comment' as const, initial: 'A', colorIndex: 0 },
            { id: 'marker-2', time: 30, type: 'annotation' as const, initial: 'B', colorIndex: 1 },
        ];

        test('should not render markers when durationTime is 0', () => {
            render(<TimeControlsV2 {...defaultProps} commentMarkers={markers} durationTime={0} />);
            expect(screen.queryAllByTestId('bp-time-controls-marker')).toHaveLength(0);
        });

        test('should render markers when durationTime is positive', () => {
            render(<TimeControlsV2 {...defaultProps} commentMarkers={markers} durationTime={60} />);
            expect(screen.getAllByTestId('bp-time-controls-marker')).toHaveLength(2);
        });

        test('should position markers based on time percentage', () => {
            render(<TimeControlsV2 {...defaultProps} commentMarkers={markers} durationTime={60} />);
            const markerEls = screen.getAllByTestId('bp-time-controls-marker');
            // 10/60 * 100 = 16.6667%
            expect(markerEls[0]).toHaveStyle({ left: '16.6667%' });
            // 30/60 * 100 = 50%
            expect(markerEls[1]).toHaveStyle({ left: '50%' });
        });

        test('should call onCommentMarkerClick when a marker is clicked', async () => {
            const user = userEvent.setup();
            const onCommentMarkerClick = jest.fn();
            render(
                <TimeControlsV2
                    {...defaultProps}
                    commentMarkers={markers}
                    durationTime={60}
                    onCommentMarkerClick={onCommentMarkerClick}
                />,
            );

            const markerEls = screen.getAllByTestId('bp-time-controls-marker');
            await user.click(markerEls[0]);
            expect(onCommentMarkerClick).toHaveBeenCalledWith(markers[0]);
        });

        test('should not render markers when commentMarkers is empty', () => {
            render(<TimeControlsV2 {...defaultProps} commentMarkers={[]} durationTime={60} />);
            expect(screen.queryAllByTestId('bp-time-controls-marker')).toHaveLength(0);
        });

        test('should render MarkerAvatar with correct props', () => {
            const markersWithAvatar: CommentMarker[] = [
                { id: 'marker-img', time: 15, avatarUrl: 'https://example.com/pic.jpg', colorIndex: 2 },
            ];
            const { container } = render(
                <TimeControlsV2 {...defaultProps} commentMarkers={markersWithAvatar} durationTime={60} />,
            );
            const img = container.querySelector('img');
            expect(img).toHaveAttribute('src', 'https://example.com/pic.jpg');
        });

        test('should render MarkerAvatar initial when no avatarUrl', () => {
            const markersWithInitial: CommentMarker[] = [{ id: 'marker-init', time: 20, initial: 'Z', colorIndex: 4 }];
            render(<TimeControlsV2 {...defaultProps} commentMarkers={markersWithInitial} durationTime={60} />);
            expect(screen.getByText('Z')).toBeInTheDocument();
        });
    });

    describe('clustering', () => {
        test('should render MarkerCluster for markers within 2px of each other', () => {
            // trackWidth=600, duration=60 => 10px/s. Markers at 10s and 10.1s => 1px apart
            const markers: CommentMarker[] = [
                { id: 'm1', time: 10, initial: 'A', colorIndex: 0 },
                { id: 'm2', time: 10.1, initial: 'B', colorIndex: 1 },
            ];
            const { container } = render(
                <TimeControlsV2 {...defaultProps} commentMarkers={markers} durationTime={60} />,
            );
            expect(container.querySelector('.bp-MarkerCluster')).toBeInTheDocument();
        });

        test('should render grouped MarkerTick for markers at the same timestamp', () => {
            const markers: CommentMarker[] = [
                { id: 'm1', time: 10, initial: 'A', colorIndex: 0 },
                { id: 'm2', time: 10, initial: 'B', colorIndex: 1 },
            ];
            const { container } = render(
                <TimeControlsV2 {...defaultProps} commentMarkers={markers} durationTime={60} />,
            );
            expect(container.querySelector('.bp-TimeControlsV2-marker--group')).toBeInTheDocument();
            expect(container.querySelector('.bp-MarkerAvatarStack')).toBeInTheDocument();
        });

        test('should render individual MarkerTicks for markers far apart', () => {
            const markers: CommentMarker[] = [
                { id: 'm1', time: 10, initial: 'A', colorIndex: 0 },
                { id: 'm2', time: 30, initial: 'B', colorIndex: 1 },
            ];
            const { container } = render(
                <TimeControlsV2 {...defaultProps} commentMarkers={markers} durationTime={60} />,
            );
            expect(screen.getAllByTestId('bp-time-controls-marker')).toHaveLength(2);
            expect(container.querySelector('.bp-MarkerCluster')).not.toBeInTheDocument();
            expect(container.querySelector('.bp-TimeControlsV2-marker--group')).not.toBeInTheDocument();
        });

        test('should call onCommentMarkerClick when a grouped marker tick is clicked', async () => {
            const user = userEvent.setup();
            const onCommentMarkerClick = jest.fn();
            const markers: CommentMarker[] = [
                { id: 'm1', time: 10, initial: 'A', colorIndex: 0 },
                { id: 'm2', time: 10, initial: 'B', colorIndex: 1 },
            ];
            const { container } = render(
                <TimeControlsV2
                    {...defaultProps}
                    commentMarkers={markers}
                    durationTime={60}
                    onCommentMarkerClick={onCommentMarkerClick}
                />,
            );
            const groupTick = container.querySelector('.bp-TimeControlsV2-marker--group') as HTMLElement;
            await user.click(groupTick);
            expect(onCommentMarkerClick).toHaveBeenCalledWith(markers[0]);
        });
    });

    describe('buffered range', () => {
        const createMockBufferedRange = (end: number): TimeRanges => ({
            length: 1,
            start: () => 0,
            end: () => end,
        });

        test('should render buffered and unplayed colors in track gradient', () => {
            const { container } = render(
                <TimeControlsV2
                    {...defaultProps}
                    bufferedRange={createMockBufferedRange(30)}
                    currentTime={10}
                    durationTime={60}
                />,
            );
            const track = container.querySelector('[data-testid="bp-slider-control-track"]') as HTMLElement;
            const { backgroundImage } = track.style;
            expect(backgroundImage).toContain('rgb(127, 127, 127)');
            expect(backgroundImage).toContain('rgb(85, 85, 85)');
        });

        test('should default to 0% buffered when bufferedRange is undefined', () => {
            const { container } = render(<TimeControlsV2 {...defaultProps} currentTime={10} durationTime={60} />);
            const track = container.querySelector('[data-testid="bp-slider-control-track"]') as HTMLElement;
            const { backgroundImage } = track.style;
            expect(backgroundImage).toContain('rgb(127, 127, 127)');
            expect(backgroundImage).toContain('rgb(85, 85, 85)');
        });
    });

    describe('track mask', () => {
        test('should not set --bp-track-mask when there are no markers', () => {
            const { container } = render(<TimeControlsV2 {...defaultProps} durationTime={60} />);
            const scrubber = container.querySelector('.bp-TimeControlsV2-scrubber');
            expect(scrubber).not.toHaveAttribute('style');
        });

        test('should set --bp-track-mask CSS variable when markers are present', () => {
            const markers: CommentMarker[] = [{ id: 'm1', time: 30 }];
            const { container } = render(
                <TimeControlsV2 {...defaultProps} commentMarkers={markers} durationTime={60} />,
            );
            const scrubber = container.querySelector('.bp-TimeControlsV2-scrubber');
            const style = scrubber?.getAttribute('style') ?? '';
            expect(style).toContain('--bp-track-mask');
            expect(style).toContain('linear-gradient');
        });
    });
});
