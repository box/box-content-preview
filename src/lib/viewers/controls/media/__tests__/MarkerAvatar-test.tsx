import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import MarkerAvatar from '../MarkerAvatar';

describe('MarkerAvatar', () => {
    describe('with avatarUrl', () => {
        test('should render an image', () => {
            const { container } = render(<MarkerAvatar avatarUrl="https://example.com/avatar.jpg" />);
            const img = container.querySelector('img');
            expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
        });

        test('should not apply background color when image is showing', () => {
            const { container } = render(<MarkerAvatar avatarUrl="https://example.com/avatar.jpg" colorIndex={3} />);
            const avatar = container.querySelector('.bp-MarkerAvatar');
            expect(avatar).not.toHaveAttribute('style');
        });

        test('should fall back to initial when image fails to load', () => {
            const { container } = render(<MarkerAvatar avatarUrl="https://bad-url.com/broken.jpg" initial="J" />);
            const img = container.querySelector('img')!;
            fireEvent.error(img);
            expect(screen.getByText('J')).toBeInTheDocument();
            expect(container.querySelector('img')).not.toBeInTheDocument();
        });

        test('should fall back to anonymous icon when image fails and no initial', () => {
            const { container } = render(<MarkerAvatar avatarUrl="https://bad-url.com/broken.jpg" />);
            const img = container.querySelector('img')!;
            fireEvent.error(img);
            expect(container.querySelector('.bp-MarkerAvatar-anonymousIcon')).toBeInTheDocument();
        });
    });

    describe('with initial', () => {
        test('should render the initial letter', () => {
            render(<MarkerAvatar initial="A" />);
            expect(screen.getByText('A')).toBeInTheDocument();
        });

        test('should apply background color based on colorIndex', () => {
            const { container } = render(<MarkerAvatar colorIndex={0} initial="B" />);
            const avatar = container.querySelector('.bp-MarkerAvatar');
            expect(avatar).toHaveStyle({ backgroundColor: '#7fb0ea' });
        });

        test('should use dark text color for light backgrounds', () => {
            const { container } = render(<MarkerAvatar colorIndex={0} initial="C" />);
            const initialEl = container.querySelector('.bp-MarkerAvatar-initial');
            expect(initialEl).toHaveStyle({ color: '#222' });
        });

        test('should use white text color for dark backgrounds', () => {
            const { container } = render(<MarkerAvatar colorIndex={1} initial="D" />);
            const initialEl = container.querySelector('.bp-MarkerAvatar-initial');
            expect(initialEl).toHaveStyle({ color: '#fff' });
        });

        test('should wrap colorIndex using modulo', () => {
            const { container } = render(<MarkerAvatar colorIndex={11} initial="E" />);
            const avatar = container.querySelector('.bp-MarkerAvatar');
            // 11 % 10 = 1 → #003c84
            expect(avatar).toHaveStyle({ backgroundColor: '#003c84' });
        });
    });

    describe('without avatarUrl or initial', () => {
        test('should render anonymous avatar icon', () => {
            const { container } = render(<MarkerAvatar />);
            expect(container.querySelector('.bp-MarkerAvatar-anonymousIcon')).toBeInTheDocument();
        });

        test('should apply background color', () => {
            const { container } = render(<MarkerAvatar colorIndex={5} />);
            const avatar = container.querySelector('.bp-MarkerAvatar');
            expect(avatar).toHaveStyle({ backgroundColor: '#91c2fd' });
        });
    });
});
