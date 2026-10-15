import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BlueprintProviders from '../../../../BlueprintProviders';
import { ControlsBarV2 } from '../../controls-bar';
import PageControlsV2 from '../PageControlsV2';

describe('PageControlsV2', () => {
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <BlueprintProviders>
            <ControlsBarV2>{children}</ControlsBarV2>
        </BlueprintProviders>
    );
    const getWrapper = (props = {}) =>
        render(
            <PageControlsV2
                onPageChange={jest.fn()}
                onPageSubmit={jest.fn()}
                pageCount={3}
                pageNumber={1}
                {...props}
            />,
            { wrapper: Wrapper },
        );
    const getPreviousPageButton = () => screen.getByRole('button', { name: __('previous_page') });
    const getNextPageButton = () => screen.getByRole('button', { name: __('next_page') });

    describe('event handlers', () => {
        test('should handle previous page click', async () => {
            const pageNumber = 2;
            const onPageChange = jest.fn();
            getWrapper({ onPageChange, pageCount: 3, pageNumber });

            await userEvent.click(getPreviousPageButton());

            expect(onPageChange).toHaveBeenCalledWith(pageNumber - 1);
        });

        test('should handle next page click', async () => {
            const pageNumber = 2;
            const onPageChange = jest.fn();
            getWrapper({ onPageChange, pageCount: 3, pageNumber });

            await userEvent.click(getNextPageButton());

            expect(onPageChange).toHaveBeenCalledWith(pageNumber + 1);
        });

        test('should not call onPageChange when a disabled button is clicked', async () => {
            const onPageChange = jest.fn();
            getWrapper({ onPageChange, pageCount: 3, pageNumber: 1 });

            await userEvent.click(getPreviousPageButton());

            expect(onPageChange).not.toHaveBeenCalled();
        });

        test('should show a tooltip when hovering the previous page button', async () => {
            getWrapper({ pageNumber: 2 });

            await userEvent.hover(getPreviousPageButton());

            expect(await screen.findByRole('tooltip')).toHaveTextContent(__('previous_page'));
        });
    });

    describe('render', () => {
        test.each`
            pageNumber | isPrevButtonDisabled | isNextButtonDisabled
            ${1}       | ${true}              | ${false}
            ${3}       | ${false}             | ${true}
            ${2}       | ${false}             | ${false}
        `(
            'should handle the disable prop correctly when pageNumber is $pageNumber',
            ({ pageNumber, isNextButtonDisabled, isPrevButtonDisabled }) => {
                getWrapper({ pageCount: 3, pageNumber });

                if (isPrevButtonDisabled) {
                    expect(getPreviousPageButton()).toBeDisabled();
                } else {
                    expect(getPreviousPageButton()).not.toBeDisabled();
                }

                if (isNextButtonDisabled) {
                    expect(getNextPageButton()).toBeDisabled();
                } else {
                    expect(getNextPageButton()).not.toBeDisabled();
                }

                expect(getPreviousPageButton().querySelector('svg')).toBeInTheDocument();
                expect(getNextPageButton().querySelector('svg')).toBeInTheDocument();
            },
        );

        test('should return an empty render if pageCount is less than 2', () => {
            getWrapper({ pageCount: 1, pageNumber: 1 });

            expect(screen.queryByRole('button', { name: __('previous_page') })).not.toBeInTheDocument();
            expect(screen.queryByRole('button', { name: __('next_page') })).not.toBeInTheDocument();
            expect(screen.queryByTestId('bp-PageControlsForm')).not.toBeInTheDocument();
        });

        test('should render the previous and next buttons around the page number form', () => {
            getWrapper();

            expect(getPreviousPageButton()).toBeInTheDocument();
            expect(getNextPageButton()).toBeInTheDocument();
            expect(screen.getByTestId('bp-PageControlsForm')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: '1 / 3' })).toBeInTheDocument();
        });

        test('should keep the resin targets and test ids of the legacy page controls', () => {
            getWrapper();

            expect(getPreviousPageButton()).toHaveAttribute('data-resin-target', 'pagePrevious');
            expect(getPreviousPageButton()).toHaveAttribute('data-testid', 'bp-PageControls-previous');
            expect(getNextPageButton()).toHaveAttribute('data-resin-target', 'pageNext');
            expect(getNextPageButton()).toHaveAttribute('data-testid', 'bp-PageControls-next');
        });
    });
});
