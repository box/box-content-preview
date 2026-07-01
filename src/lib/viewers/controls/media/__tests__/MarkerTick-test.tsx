import React from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import MarkerTick from '../MarkerTick';
import { CommentMarker } from '../types';

describe('MarkerTick', () => {
    const singleMarker: CommentMarker[] = [{ id: 'm1', time: 10, initial: 'A', colorIndex: 0 }];

    const groupMarkers: CommentMarker[] = [
        { id: 'm1', time: 10, initial: 'A', colorIndex: 0 },
        { id: 'm2', time: 10, initial: 'B', colorIndex: 1 },
        { id: 'm3', time: 10, initial: 'C', colorIndex: 2 },
    ];

    describe('single marker', () => {
        test('should render with correct position', () => {
            render(<MarkerTick markers={singleMarker} position={16.6667} />);
            const el = screen.getByTestId('bp-time-controls-marker');
            expect(el).toHaveStyle({ left: '16.6667%' });
        });

        test('should not have group modifier class', () => {
            render(<MarkerTick markers={singleMarker} position={16.6667} />);
            const el = screen.getByTestId('bp-time-controls-marker');
            expect(el).toHaveClass('bp-TimeControlsV2-marker');
            expect(el).not.toHaveClass('bp-TimeControlsV2-marker--group');
        });

        test('should render a single MarkerAvatar', () => {
            render(<MarkerTick markers={singleMarker} position={16.6667} />);
            expect(screen.getByText('A')).toBeInTheDocument();
        });

        test('should call onMarkerClick when clicked', async () => {
            const user = userEvent.setup();
            const onMarkerClick = jest.fn();
            render(<MarkerTick markers={singleMarker} onMarkerClick={onMarkerClick} position={16.6667} />);
            await user.click(screen.getByTestId('bp-time-controls-marker'));
            expect(onMarkerClick).toHaveBeenCalledWith(singleMarker[0]);
        });
    });

    describe('group markers', () => {
        test('should have group modifier class', () => {
            render(<MarkerTick markers={groupMarkers} position={16.6667} />);
            const el = screen.getByTestId('bp-time-controls-marker');
            expect(el).toHaveClass('bp-TimeControlsV2-marker--group');
        });

        test('should render MarkerAvatarStack instead of single avatar', () => {
            const { container } = render(<MarkerTick markers={groupMarkers} position={16.6667} />);
            expect(container.querySelector('.bp-MarkerAvatarStack')).toBeInTheDocument();
        });

        test('should render all marker avatars', () => {
            render(<MarkerTick markers={groupMarkers} position={16.6667} />);
            expect(screen.getByText('A')).toBeInTheDocument();
            expect(screen.getByText('B')).toBeInTheDocument();
            expect(screen.getByText('C')).toBeInTheDocument();
        });

        test('should call onMarkerClick with first marker when tick button is clicked', async () => {
            const user = userEvent.setup();
            const onMarkerClick = jest.fn();
            render(<MarkerTick markers={groupMarkers} onMarkerClick={onMarkerClick} position={16.6667} />);
            await user.click(screen.getByTestId('bp-time-controls-marker'));
            expect(onMarkerClick).toHaveBeenCalledWith(groupMarkers[0]);
        });
    });
});
