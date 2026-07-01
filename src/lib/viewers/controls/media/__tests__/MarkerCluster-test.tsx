import React from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import MarkerCluster from '../MarkerCluster';
import { ClusterData, CommentMarker } from '../types';

describe('MarkerCluster', () => {
    const markers: CommentMarker[] = [
        { id: 'm1', time: 10, initial: 'A', colorIndex: 0 },
        { id: 'm2', time: 10.1, initial: 'B', colorIndex: 1 },
        { id: 'm3', time: 10.2, initial: 'C', colorIndex: 2 },
    ];

    const rangeCluster: ClusterData = {
        id: 'm1|m2|m3',
        isSinglePoint: false,
        leftPercent: 10,
        markers,
        rightPercent: 15,
    };

    test('should render with correct positioning and width', () => {
        render(<MarkerCluster cluster={rangeCluster} />);
        const el = screen.getByTestId('bp-marker-cluster');
        expect(el).toHaveStyle({ left: '10%', width: 'calc(5% + 4px)' });
    });

    test('should render the grey tick element', () => {
        const { container } = render(<MarkerCluster cluster={rangeCluster} />);
        expect(container.querySelector('.bp-MarkerCluster-tick')).toBeInTheDocument();
    });

    test('should render avatars via MarkerAvatarStack', () => {
        render(<MarkerCluster cluster={rangeCluster} />);
        expect(screen.getByText('A')).toBeInTheDocument();
        expect(screen.getByText('B')).toBeInTheDocument();
        expect(screen.getByText('C')).toBeInTheDocument();
    });

    test('should show overflow indicator when more than 4 markers', () => {
        const manyMarkers: CommentMarker[] = [
            { id: 'm1', time: 10, initial: 'A', colorIndex: 0 },
            { id: 'm2', time: 10.1, initial: 'B', colorIndex: 1 },
            { id: 'm3', time: 10.2, initial: 'C', colorIndex: 2 },
            { id: 'm4', time: 10.3, initial: 'D', colorIndex: 3 },
            { id: 'm5', time: 10.4, initial: 'E', colorIndex: 4 },
        ];
        const cluster: ClusterData = {
            id: 'm1|m2|m3|m4|m5',
            isSinglePoint: false,
            leftPercent: 10,
            markers: manyMarkers,
            rightPercent: 15,
        };
        render(<MarkerCluster cluster={cluster} />);
        expect(screen.getByText('A')).toBeInTheDocument();
        expect(screen.getByText('B')).toBeInTheDocument();
        expect(screen.getByText('C')).toBeInTheDocument();
        expect(screen.queryByText('D')).not.toBeInTheDocument();
        expect(screen.queryByText('E')).not.toBeInTheDocument();
        expect(screen.getByText('+2')).toBeInTheDocument();
    });

    test('should call onMarkerClick with first marker when tick is clicked', async () => {
        const user = userEvent.setup();
        const onMarkerClick = jest.fn();
        const { container } = render(<MarkerCluster cluster={rangeCluster} onMarkerClick={onMarkerClick} />);
        const tick = container.querySelector('.bp-MarkerCluster-tick') as HTMLElement;
        await user.click(tick);
        expect(onMarkerClick).toHaveBeenCalledWith(markers[0]);
    });

    test('should call onMarkerClick with specific marker when avatar is clicked', async () => {
        const user = userEvent.setup();
        const onMarkerClick = jest.fn();
        const { container } = render(<MarkerCluster cluster={rangeCluster} onMarkerClick={onMarkerClick} />);
        const avatarItems = container.querySelectorAll('.bp-MarkerAvatarStack-item');
        await user.click(avatarItems[1] as HTMLElement);
        expect(onMarkerClick).toHaveBeenCalledWith(markers[1]);
    });
});
