import React from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { CommentMarker } from '../../../controls/media/types';
import { createWaveformViewport } from '../viewport';
import WaveformCommentMarkers from '../WaveformCommentMarkers';

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

describe('WaveformCommentMarkers', () => {
    const markers: CommentMarker[] = [
        {
            avatarUrl: 'https://example.com/a.png',
            colorIndex: 0,
            id: 'marker-1',
            initial: 'A',
            time: 10,
            type: 'comment',
        },
        { colorIndex: 1, id: 'marker-2', initial: 'B', time: 30, type: 'annotation' },
    ];

    const hostCommentMarker: CommentMarker = {
        avatarUrl: 'https://example.com/a.png',
        colorIndex: 9278424974,
        id: '507397',
        initial: 'A',
        time: 72.729,
        type: 'comment',
    };

    test('should not render when duration is 0', () => {
        const { container } = render(<WaveformCommentMarkers commentMarkers={markers} durationSec={0} />);

        expect(container).toBeEmptyDOMElement();
    });

    test('should not render when there are no markers', () => {
        const { container } = render(<WaveformCommentMarkers commentMarkers={[]} durationSec={60} />);

        expect(container).toBeEmptyDOMElement();
    });

    test('should draw badges when markers arrive after an empty mount', () => {
        const { rerender } = render(<WaveformCommentMarkers commentMarkers={[]} durationSec={180} />);

        expect(screen.queryByTestId('bp-waveform-comment-markers')).not.toBeInTheDocument();

        rerender(<WaveformCommentMarkers commentMarkers={[hostCommentMarker]} durationSec={180} />);

        expect(screen.getByTestId('bp-waveform-comment-marker')).toHaveStyle({
            left: `${(72.729 / 180) * 100}%`,
        });
    });

    test('should stack avatars at the same timestamp', () => {
        render(
            <WaveformCommentMarkers
                commentMarkers={[
                    { colorIndex: 0, id: 'same-a', initial: 'A', time: 10, type: 'comment' },
                    { colorIndex: 1, id: 'same-b', initial: 'B', time: 10, type: 'comment' },
                ]}
                durationSec={60}
            />,
        );

        const badge = screen.getByTestId('bp-waveform-comment-marker');
        expect(badge).toHaveClass('bp-WaveformCommentMarkers-marker--group');
        expect(badge.querySelectorAll('.bp-MarkerAvatarStack-item')).toHaveLength(2);
        expect(screen.getByText('A')).toBeInTheDocument();
        expect(screen.getByText('B')).toBeInTheDocument();
    });

    test('should place badges and stack exact timestamps before the track is measured', () => {
        Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 0 });
        try {
            render(
                <WaveformCommentMarkers
                    commentMarkers={[
                        { colorIndex: 0, id: 'same-a', initial: 'A', time: 10, type: 'comment' },
                        { colorIndex: 1, id: 'same-b', initial: 'B', time: 10, type: 'comment' },
                        { colorIndex: 2, id: 'far', initial: 'C', time: 30, type: 'comment' },
                    ]}
                    durationSec={60}
                />,
            );

            const badges = screen.getAllByTestId('bp-waveform-comment-marker');
            expect(badges).toHaveLength(2);
            expect(badges[0]).toHaveClass('bp-WaveformCommentMarkers-marker--group');
            expect(badges[1]).not.toHaveClass('bp-WaveformCommentMarkers-marker--group');
        } finally {
            Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 600 });
        }
    });

    test('should use the video overflow chip when more than four markers share a cluster', () => {
        render(
            <WaveformCommentMarkers
                commentMarkers={[
                    { colorIndex: 0, id: 'o-a', initial: 'A', time: 10, type: 'comment' },
                    { colorIndex: 1, id: 'o-b', initial: 'B', time: 10, type: 'comment' },
                    { colorIndex: 2, id: 'o-c', initial: 'C', time: 10, type: 'comment' },
                    { colorIndex: 3, id: 'o-d', initial: 'D', time: 10, type: 'comment' },
                    { colorIndex: 4, id: 'o-e', initial: 'E', time: 10, type: 'comment' },
                ]}
                durationSec={60}
            />,
        );

        expect(
            screen.getByTestId('bp-waveform-comment-marker').querySelector('.bp-MarkerAvatarStack-overflowBadge'),
        ).toBeInTheDocument();
        expect(screen.getByText('+2')).toBeInTheDocument();
    });

    test('should stack nearby avatars that would overlap', () => {
        render(
            <WaveformCommentMarkers
                commentMarkers={[
                    { colorIndex: 0, id: 'near-a', initial: 'A', time: 10, type: 'comment' },
                    { colorIndex: 1, id: 'near-b', initial: 'B', time: 11, type: 'comment' },
                ]}
                durationSec={60}
            />,
        );

        expect(screen.getByTestId('bp-waveform-comment-marker')).toHaveClass('bp-WaveformCommentMarkers-marker--group');
        expect(
            screen.getByTestId('bp-waveform-comment-marker').querySelectorAll('.bp-MarkerAvatarStack-item'),
        ).toHaveLength(2);
    });

    test('should position avatar badges from the host comment_markers payload', () => {
        render(<WaveformCommentMarkers commentMarkers={markers} durationSec={60} />);

        const badges = screen.getAllByTestId('bp-waveform-comment-marker');
        expect(badges).toHaveLength(2);
        expect(badges[0]).toHaveAttribute('data-resin-target', 'commentMarker');
        expect(badges[0]).toHaveStyle({ left: '16.6667%' });
        expect(badges[1]).toHaveStyle({ left: '50%' });
        expect(badges[0].querySelector('img')).toHaveAttribute('src', 'https://example.com/a.png');
    });

    test('should keep a file-start marker centered at 0% so the 1x gutter can show the full badge', () => {
        render(
            <WaveformCommentMarkers
                commentMarkers={[{ ...hostCommentMarker, id: 'start', time: 0 }]}
                durationSec={180}
            />,
        );

        expect(screen.getByTestId('bp-waveform-comment-markers')).not.toHaveClass('bp-WaveformCommentMarkers--zoomed');
        expect(screen.getByTestId('bp-waveform-comment-marker')).toHaveStyle({ left: '0%' });
    });

    test('should place a host comment_markers entry at time over duration', () => {
        render(<WaveformCommentMarkers commentMarkers={[hostCommentMarker]} durationSec={180} />);

        expect(screen.getByTestId('bp-waveform-comment-marker')).toHaveStyle({
            left: `${(72.729 / 180) * 100}%`,
        });
        expect(screen.getByTestId('bp-waveform-comment-marker').querySelector('img')).toHaveAttribute(
            'src',
            hostCommentMarker.avatarUrl,
        );
    });

    test('should select a badge with a white ring and notify the click handler', async () => {
        const user = userEvent.setup();
        const onCommentMarkerClick = jest.fn();
        render(
            <WaveformCommentMarkers
                commentMarkers={markers}
                durationSec={60}
                onCommentMarkerClick={onCommentMarkerClick}
            />,
        );

        const badge = screen.getAllByTestId('bp-waveform-comment-marker')[0];
        await user.click(badge);

        expect(onCommentMarkerClick).toHaveBeenCalledWith(markers[0]);
        expect(badge).toHaveClass('bp-WaveformCommentMarkers-marker--selected');
        expect(badge).toHaveAttribute('aria-pressed', 'true');
    });

    test('should show the ring when the host marks a comment selected', () => {
        render(<WaveformCommentMarkers commentMarkers={markers} durationSec={60} selectedId="marker-1" />);

        expect(screen.getAllByTestId('bp-waveform-comment-marker')[0]).toHaveClass(
            'bp-WaveformCommentMarkers-marker--selected',
        );
    });

    test('should drop the ring on pointerdown outside the selected badge', async () => {
        const user = userEvent.setup();
        render(<WaveformCommentMarkers commentMarkers={markers} durationSec={60} selectedId="marker-1" />);

        const badge = screen.getAllByTestId('bp-waveform-comment-marker')[0];
        expect(badge).toHaveClass('bp-WaveformCommentMarkers-marker--selected');

        await user.click(document.body);

        expect(badge).not.toHaveClass('bp-WaveformCommentMarkers-marker--selected');
    });

    test('should restore the ring when the host selects a different comment', async () => {
        const user = userEvent.setup();
        const { rerender } = render(
            <WaveformCommentMarkers commentMarkers={markers} durationSec={60} selectedId="marker-1" />,
        );

        await user.click(document.body);
        expect(screen.getAllByTestId('bp-waveform-comment-marker')[0]).not.toHaveClass(
            'bp-WaveformCommentMarkers-marker--selected',
        );

        rerender(<WaveformCommentMarkers commentMarkers={markers} durationSec={60} selectedId="marker-2" />);

        expect(screen.getAllByTestId('bp-waveform-comment-marker')[1]).toHaveClass(
            'bp-WaveformCommentMarkers-marker--selected',
        );
    });

    test('should follow the visible window when the waveform viewport changes', () => {
        const zoomed = createWaveformViewport({
            durationSec: 180,
            heightPx: 140,
            maxZoom: 4,
            scrollLeftPx: 0,
            widthPx: 800,
            zoomLevel: 2,
        });
        const { rerender } = render(<WaveformCommentMarkers commentMarkers={[hostCommentMarker]} durationSec={180} />);

        const badge = screen.getByTestId('bp-waveform-comment-marker');
        expect(badge).toHaveStyle({
            left: `${(72.729 / 180) * 100}%`,
        });

        rerender(<WaveformCommentMarkers commentMarkers={[hostCommentMarker]} durationSec={180} viewport={zoomed} />);

        expect(screen.getByTestId('bp-waveform-comment-markers')).toHaveClass('bp-WaveformCommentMarkers--zoomed');
        expect(badge).toHaveStyle({
            left: `${(72.729 / 90) * 100}%`,
        });
        expect(badge.querySelector('img')).toHaveAttribute('src', hostCommentMarker.avatarUrl);

        const panned = createWaveformViewport({
            durationSec: 180,
            heightPx: 140,
            maxZoom: 4,
            scrollLeftPx: 800,
            widthPx: 800,
            zoomLevel: 2,
        });
        rerender(<WaveformCommentMarkers commentMarkers={[hostCommentMarker]} durationSec={180} viewport={panned} />);

        expect(badge).toBeInTheDocument();
        expect(badge.querySelector('img')).toHaveAttribute('src', hostCommentMarker.avatarUrl);
        expect(badge).toHaveStyle({
            left: `${((72.729 - 90) / 90) * 100}%`,
        });
    });

    test('should place badges in a zoomed window that already existed on mount', () => {
        render(
            <WaveformCommentMarkers
                commentMarkers={[hostCommentMarker]}
                durationSec={180}
                viewport={createWaveformViewport({
                    durationSec: 180,
                    heightPx: 140,
                    maxZoom: 4,
                    scrollLeftPx: 800,
                    widthPx: 800,
                    zoomLevel: 2,
                })}
            />,
        );

        expect(screen.getByTestId('bp-waveform-comment-markers')).toHaveClass('bp-WaveformCommentMarkers--zoomed');
        expect(screen.getByTestId('bp-waveform-comment-marker')).toHaveStyle({
            left: `${((72.729 - 90) / 90) * 100}%`,
        });
    });
});
