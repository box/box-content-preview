import React from 'react';
import { Toolbar } from '@box/blueprint-web';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BlueprintProviders from '../../../../BlueprintProviders';
import GalleryToggleV2 from '../GalleryToggleV2';

jest.mock('@box/blueprint-web-assets/icons/Medium/GridView', () => ({
    __esModule: true,
    default: () => <svg data-testid="GridView" />,
}));

describe('GalleryToggleV2', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <BlueprintProviders>
            <Toolbar.Root>{children}</Toolbar.Root>
        </BlueprintProviders>
    );
    const getWrapper = (props = {}) => render(<GalleryToggleV2 {...props} />, { wrapper });
    const getButton = () => screen.getByRole('button', { name: __('gallery_view') });

    describe('render', () => {
        test('should return null if no callback is defined', () => {
            getWrapper();

            expect(screen.queryByRole('button')).toBeNull();
        });

        test('should render a button when onGalleryToggle is provided', () => {
            getWrapper({ onGalleryToggle: jest.fn() });

            expect(getButton()).toHaveAttribute('data-resin-target', 'galleryView');
        });

        test('should render the GridView icon', () => {
            getWrapper({ onGalleryToggle: jest.fn() });

            expect(screen.getByTestId('GridView')).toBeInTheDocument();
        });

        test('should show the label as a tooltip on focus', async () => {
            getWrapper({ onGalleryToggle: jest.fn() });

            await userEvent.tab();

            expect(await screen.findByRole('tooltip')).toHaveTextContent(__('gallery_view'));
        });
    });

    describe('selected state', () => {
        test.each`
            isGalleryOpen | pressed    | state
            ${true}       | ${'true'}  | ${'on'}
            ${false}      | ${'false'} | ${'off'}
        `(
            'should set the selected state to $state when isGalleryOpen is $isGalleryOpen',
            ({ isGalleryOpen, pressed, state }) => {
                getWrapper({ onGalleryToggle: jest.fn(), isGalleryOpen });

                expect(getButton()).toHaveAttribute('aria-pressed', pressed);
                expect(getButton()).toHaveAttribute('data-state', state);
            },
        );
    });

    describe('event handlers', () => {
        test.each([true, false])(
            'should call onGalleryToggle on click when isGalleryOpen is %s',
            async isGalleryOpen => {
                const onToggle = jest.fn();
                getWrapper({ isGalleryOpen, onGalleryToggle: onToggle });

                await userEvent.click(getButton());

                expect(onToggle).toHaveBeenCalledTimes(1);
                expect(onToggle).toHaveBeenCalledWith();
            },
        );

        test.each([
            ['Enter', '{Enter}'],
            ['Space', ' '],
        ])('should call onGalleryToggle on %s', async (name, key) => {
            const onToggle = jest.fn();
            getWrapper({ onGalleryToggle: onToggle });

            await userEvent.tab();
            await userEvent.keyboard(key);

            expect(onToggle).toHaveBeenCalledTimes(1);
        });
    });
});
