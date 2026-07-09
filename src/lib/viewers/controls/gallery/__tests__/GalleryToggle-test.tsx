import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GalleryToggle from '../GalleryToggle';

describe('GalleryToggle', () => {
    const getWrapper = (props = {}) => render(<GalleryToggle {...props} />);

    describe('render', () => {
        test('should return null if no callback is defined', () => {
            getWrapper();
            expect(screen.queryByRole('button')).toBeNull();
        });

        test('should render a button when onGalleryToggle is provided', () => {
            getWrapper({ onGalleryToggle: jest.fn() });
            expect(screen.getByRole('button')).toBeInTheDocument();
        });

        test('should render the GridView icon', () => {
            getWrapper({ onGalleryToggle: jest.fn() });
            expect(screen.getByTestId('IconGridView24')).toBeVisible();
        });
    });

    describe('aria', () => {
        test.each([true, false])('should set aria-pressed to %s', async isGalleryOpen => {
            getWrapper({ onGalleryToggle: jest.fn(), isGalleryOpen });
            const button = screen.getByRole('button');
            expect(button).toHaveAttribute('aria-pressed', isGalleryOpen.toString());
        });
    });

    describe('active state', () => {
        test('should have bp-is-active class when isGalleryOpen is true', () => {
            getWrapper({ onGalleryToggle: jest.fn(), isGalleryOpen: true });
            expect(screen.getByRole('button')).toHaveClass('bp-is-active');
        });

        test('should not have bp-is-active class when isGalleryOpen is false', () => {
            getWrapper({ onGalleryToggle: jest.fn(), isGalleryOpen: false });
            expect(screen.getByRole('button')).not.toHaveClass('bp-is-active');
        });
    });

    describe('event handlers', () => {
        test('should call onGalleryToggle on click', async () => {
            const onToggle = jest.fn();
            getWrapper({ onGalleryToggle: onToggle });
            await userEvent.click(screen.getByRole('button'));
            expect(onToggle).toHaveBeenCalled();
        });
    });
});
