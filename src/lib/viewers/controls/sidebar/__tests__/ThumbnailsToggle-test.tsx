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

        test('should apply modernized class when modernizationEnabled is true', async () => {
            getWrapper({ onThumbnailsToggle: jest.fn(), modernizationEnabled: true });
            const button = await getButton();

            expect(button).toHaveClass('bp-ThumbnailsToggle--modernized');
        });

        test('should not apply modernized class when modernizationEnabled is false', async () => {
            getWrapper({ onThumbnailsToggle: jest.fn(), modernizationEnabled: false });
            const button = await getButton();

            expect(button).not.toHaveClass('bp-ThumbnailsToggle--modernized');
        });

        test('should render IconNavMediumFilled24 when modernizationEnabled is true', async () => {
            getWrapper({ onThumbnailsToggle: jest.fn(), modernizationEnabled: true });

            expect(await screen.findByTestId('IconNavMediumFilled24')).toBeInTheDocument();
            expect(screen.queryByTestId('IconThumbnailsToggle24')).not.toBeInTheDocument();
        });

        test('should render IconThumbnailsToggle24 when modernizationEnabled is false', async () => {
            getWrapper({ onThumbnailsToggle: jest.fn(), modernizationEnabled: false });

            expect(await screen.findByTestId('IconThumbnailsToggle24')).toBeInTheDocument();
            expect(screen.queryByTestId('IconNavMediumFilled24')).not.toBeInTheDocument();
        });
    });
});
