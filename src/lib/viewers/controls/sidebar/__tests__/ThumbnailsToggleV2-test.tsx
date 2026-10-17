import React from 'react';
import { Toolbar } from '@box/blueprint-web';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BlueprintProviders from '../../../../BlueprintProviders';
import ThumbnailsToggleV2 from '../ThumbnailsToggleV2';

jest.mock('@box/blueprint-web-assets/icons/Medium/Nav', () => ({
    __esModule: true,
    default: () => <svg data-testid="Nav" />,
}));
jest.mock('@box/blueprint-web-assets/icons/MediumFilled/Nav', () => ({
    __esModule: true,
    default: () => <svg data-testid="NavFilled" />,
}));

describe('ThumbnailsToggleV2', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <BlueprintProviders>
            <Toolbar.Root>{children}</Toolbar.Root>
        </BlueprintProviders>
    );
    const getWrapper = (props = {}) => render(<ThumbnailsToggleV2 {...props} />, { wrapper });
    const getButton = () => screen.getByRole('button', { name: __('toggle_thumbnails') });

    describe('event handlers', () => {
        test.each([true, false])(
            'should forward the click from the button when isThumbnailsOpen is %s',
            async isThumbnailsOpen => {
                const onToggle = jest.fn();
                getWrapper({ isThumbnailsOpen, onThumbnailsToggle: onToggle });

                await userEvent.click(getButton());

                expect(onToggle).toHaveBeenCalledTimes(1);
                expect(onToggle).toHaveBeenCalledWith();
            },
        );
    });

    describe('render', () => {
        test('should return a valid wrapper', () => {
            getWrapper({ onThumbnailsToggle: jest.fn() });

            expect(getButton()).toHaveAttribute('data-resin-target', 'thumbnails');
            expect(screen.getByTestId('Nav')).toBeInTheDocument();
            expect(screen.queryByTestId('NavFilled')).not.toBeInTheDocument();
        });

        test('should wrap the toggle in an element that controls its visibility', () => {
            getWrapper({ onThumbnailsToggle: jest.fn() });

            expect(getButton().closest('.bp-ThumbnailsToggleV2')).toBeInTheDocument();
        });

        test('should return an empty wrapper if no callback is defined', () => {
            getWrapper();

            expect(screen.queryByRole('button')).toBeNull();
        });

        test.each([true, false])('should set aria-expanded to isThumbnailsOpen: %s', isThumbnailsOpen => {
            getWrapper({ onThumbnailsToggle: jest.fn(), isThumbnailsOpen });

            expect(getButton()).toHaveAttribute('aria-expanded', isThumbnailsOpen.toString());
        });

        test.each`
            isThumbnailsOpen | pressed    | state
            ${true}          | ${'true'}  | ${'on'}
            ${false}         | ${'false'} | ${'off'}
        `(
            'should set the selected state to $state when isThumbnailsOpen is $isThumbnailsOpen',
            ({ isThumbnailsOpen, pressed, state }) => {
                getWrapper({ onThumbnailsToggle: jest.fn(), isThumbnailsOpen });

                expect(getButton()).toHaveAttribute('aria-pressed', pressed);
                expect(getButton()).toHaveAttribute('data-state', state);
            },
        );

        test('should render the filled icon when isThumbnailsOpen is true', () => {
            getWrapper({ onThumbnailsToggle: jest.fn(), isThumbnailsOpen: true });

            expect(screen.getByTestId('NavFilled')).toBeInTheDocument();
            expect(screen.queryByTestId('Nav')).not.toBeInTheDocument();
        });

        test('should show the label as a tooltip on focus', async () => {
            getWrapper({ onThumbnailsToggle: jest.fn() });

            await userEvent.tab();

            expect(await screen.findByRole('tooltip')).toHaveTextContent(__('toggle_thumbnails'));
        });
    });
});
