import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ThumbnailsToggle from '../ThumbnailsToggle';

describe('ThumbnailsToggle', () => {
    const getWrapper = (props = {}) => render(<ThumbnailsToggle {...props} />);
    const getButton = async () => screen.findByRole('button');
    const getIcon = async () => screen.findByTestId('IconThumbnailsToggle24');

    describe('event handlers', () => {
        test('should forward the click from the button', async () => {
            const onToggle = jest.fn();
            getWrapper({ onThumbnailsToggle: onToggle });
            const button = await getButton();

            await userEvent.click(button);

            expect(onToggle).toHaveBeenCalled();
        });
    });

    describe('render', () => {
        test('should return a valid wrapper', async () => {
            getWrapper({ onThumbnailsToggle: jest.fn() });
            const button = await getButton();
            const icon = await getIcon();

            expect(button).toBeInTheDocument();
            expect(icon).toBeInTheDocument();
        });

        test('should return an empty wrapper if no callback is defined', () => {
            getWrapper();
            const button = screen.queryByRole('button');

            expect(button).toBeNull();
        });

        test.each([true, false])(
            'should have a property aria-expanded setted isThumbnailsOpen: %s',
            async isThumbnailsOpen => {
                getWrapper({ onThumbnailsToggle: jest.fn(), isThumbnailsOpen });
                const button = await getButton();

                expect(button).toHaveAttribute('aria-expanded', isThumbnailsOpen.toString());
            },
        );
    });
});
