import React from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import MarkerAvatarStack from '../MarkerAvatarStack';
import { CommentMarker } from '../types';

describe('MarkerAvatarStack', () => {
    const markers: CommentMarker[] = [
        { id: 'm1', time: 10, initial: 'A', colorIndex: 0 },
        { id: 'm2', time: 10, initial: 'B', colorIndex: 1 },
        { id: 'm3', time: 10, initial: 'C', colorIndex: 2 },
    ];

    test('should render all markers when count is within limit', () => {
        render(<MarkerAvatarStack markers={markers} />);
        expect(screen.getByText('A')).toBeInTheDocument();
        expect(screen.getByText('B')).toBeInTheDocument();
        expect(screen.getByText('C')).toBeInTheDocument();
    });

    test('should not show overflow badge when markers are within limit', () => {
        const { container } = render(<MarkerAvatarStack markers={markers} />);
        expect(container.querySelector('.bp-MarkerAvatarStack-overflow')).not.toBeInTheDocument();
    });

    test('should show exactly 4 markers without overflow', () => {
        const fourMarkers: CommentMarker[] = [
            { id: 'm1', time: 10, initial: 'A', colorIndex: 0 },
            { id: 'm2', time: 10, initial: 'B', colorIndex: 1 },
            { id: 'm3', time: 10, initial: 'C', colorIndex: 2 },
            { id: 'm4', time: 10, initial: 'D', colorIndex: 3 },
        ];
        const { container } = render(<MarkerAvatarStack markers={fourMarkers} />);
        expect(screen.getByText('A')).toBeInTheDocument();
        expect(screen.getByText('B')).toBeInTheDocument();
        expect(screen.getByText('C')).toBeInTheDocument();
        expect(screen.getByText('D')).toBeInTheDocument();
        expect(container.querySelector('.bp-MarkerAvatarStack-overflow')).not.toBeInTheDocument();
    });

    describe('overflow', () => {
        const manyMarkers: CommentMarker[] = [
            { id: 'm1', time: 10, initial: 'A', colorIndex: 0 },
            { id: 'm2', time: 10, initial: 'B', colorIndex: 1 },
            { id: 'm3', time: 10, initial: 'C', colorIndex: 2 },
            { id: 'm4', time: 10, initial: 'D', colorIndex: 3 },
            { id: 'm5', time: 10, initial: 'E', colorIndex: 4 },
            { id: 'm6', time: 10, initial: 'F', colorIndex: 5 },
        ];

        test('should show first 3 avatars and overflow badge when more than 4', () => {
            render(<MarkerAvatarStack markers={manyMarkers} />);
            expect(screen.getByText('A')).toBeInTheDocument();
            expect(screen.getByText('B')).toBeInTheDocument();
            expect(screen.getByText('C')).toBeInTheDocument();
            expect(screen.queryByText('D')).not.toBeInTheDocument();
            expect(screen.queryByText('E')).not.toBeInTheDocument();
            expect(screen.queryByText('F')).not.toBeInTheDocument();
        });

        test('should display correct overflow count', () => {
            render(<MarkerAvatarStack markers={manyMarkers} />);
            // 6 markers - 3 visible = +3
            expect(screen.getByText('+3')).toBeInTheDocument();
        });

        test('should call onMarkerClick with first hidden marker when overflow is clicked', async () => {
            const user = userEvent.setup();
            const onMarkerClick = jest.fn();
            const { container } = render(<MarkerAvatarStack markers={manyMarkers} onMarkerClick={onMarkerClick} />);
            const overflow = container.querySelector('.bp-MarkerAvatarStack-overflow') as HTMLElement;
            await user.click(overflow);
            expect(onMarkerClick).toHaveBeenCalledWith(manyMarkers[3]);
        });
    });

    test('should call onMarkerClick with correct marker when individual avatar is clicked', async () => {
        const user = userEvent.setup();
        const onMarkerClick = jest.fn();
        const { container } = render(<MarkerAvatarStack markers={markers} onMarkerClick={onMarkerClick} />);
        const items = container.querySelectorAll('.bp-MarkerAvatarStack-item');
        await user.click(items[1] as HTMLElement);
        expect(onMarkerClick).toHaveBeenCalledWith(markers[1]);
    });
});
