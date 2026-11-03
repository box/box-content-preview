import React from 'react';
import { Toolbar } from '@box/blueprint-web';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BlueprintProviders from '../../../../BlueprintProviders';
import ThumbnailsToggleV2 from '../ThumbnailsToggleV2';

jest.mock('@box/blueprint-web-assets/icons/Medium/SidebarChevronLeft', () => ({
    __esModule: true,
    default: () => <svg data-testid="SidebarChevronLeft" />,
}));
jest.mock('@box/blueprint-web-assets/icons/Medium/SidebarChevronRight', () => ({
    __esModule: true,
    default: () => <svg data-testid="SidebarChevronRight" />,
}));

describe('ThumbnailsToggleV2', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <BlueprintProviders>
            <Toolbar.Root>{children}</Toolbar.Root>
        </BlueprintProviders>
    );
    const getWrapper = (props = {}) => render(<ThumbnailsToggleV2 {...props} />, { wrapper });
    const getButton = () => screen.getByRole('button', { name: /thumbnails/ });

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
            expect(screen.getByTestId('SidebarChevronRight')).toBeInTheDocument();
            expect(screen.queryByTestId('SidebarChevronLeft')).not.toBeInTheDocument();
        });

        test('should wrap the button in an element that controls its visibility', () => {
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

        test('should render the left chevron when the sidebar is open', () => {
            getWrapper({ onThumbnailsToggle: jest.fn(), isThumbnailsOpen: true });

            expect(screen.getByTestId('SidebarChevronLeft')).toBeInTheDocument();
            expect(screen.queryByTestId('SidebarChevronRight')).not.toBeInTheDocument();
        });

        test.each`
            isThumbnailsOpen | label
            ${true}          | ${'Hide thumbnails'}
            ${false}         | ${'Show thumbnails'}
        `(
            'should label the button $label when isThumbnailsOpen is $isThumbnailsOpen',
            ({ isThumbnailsOpen, label }) => {
                getWrapper({ onThumbnailsToggle: jest.fn(), isThumbnailsOpen });

                expect(screen.getByRole('button', { name: label })).toBe(getButton());
            },
        );

        test.each`
            isThumbnailsOpen | label
            ${true}          | ${'Hide thumbnails'}
            ${false}         | ${'Show thumbnails'}
        `('should show $label as a tooltip on focus', async ({ isThumbnailsOpen, label }) => {
            getWrapper({ onThumbnailsToggle: jest.fn(), isThumbnailsOpen });

            await userEvent.tab();

            expect(await screen.findByRole('tooltip')).toHaveTextContent(label);
        });
    });
});
