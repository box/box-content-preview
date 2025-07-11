import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PageControls from '../PageControls';

describe('PageControls', () => {
    const getWrapper = (props = {}) =>
        render(
            <PageControls onPageChange={jest.fn()} onPageSubmit={jest.fn()} pageCount={3} pageNumber={1} {...props} />,
        );
    const getPreviousPageButton = async () => screen.findByTitle(__('previous_page'));
    const getNextPageButton = async () => screen.findByTitle(__('next_page'));

    describe('event handlers', () => {
        test('should handle previous page click', async () => {
            const pageNumber = 2;
            const onPageChange = jest.fn();
            getWrapper({ onPageChange, pageCount: 3, pageNumber });
            const previousPageButton = await getPreviousPageButton();

            await userEvent.click(previousPageButton);

            expect(onPageChange).toHaveBeenCalledWith(pageNumber - 1);
        });

        test('should handle next page click', async () => {
            const pageNumber = 2;
            const onPageChange = jest.fn();
            getWrapper({ onPageChange, pageCount: 3, pageNumber });
            const nextPageButton = await getNextPageButton();

            await userEvent.click(nextPageButton);

            expect(onPageChange).toHaveBeenCalledWith(pageNumber + 1);
        });
    });

    describe('render', () => {
        test.each`
            pageNumber | isPrevButtonDisabled | isNextButtonDisabled
            ${1}       | ${true}              | ${false}
            ${3}       | ${false}             | ${true}
            ${2}       | ${false}             | ${false}
        `(
            'should handle the disable prop correctly when pageNumber is $pageNumber and pageCount is $pageCount',
            async ({ pageNumber, isNextButtonDisabled, isPrevButtonDisabled }) => {
                getWrapper({ pageCount: 3, pageNumber });
                const previousPageButton = await getPreviousPageButton();
                const nextPageButton = await getNextPageButton();

                if (isPrevButtonDisabled) {
                    expect(previousPageButton).toBeDisabled();
                } else {
                    expect(previousPageButton).not.toBeDisabled();
                }

                if (isNextButtonDisabled) {
                    expect(nextPageButton).toBeDisabled();
                } else {
                    expect(nextPageButton).not.toBeDisabled();
                }
            },
        );

        test('should return an empty render if pageCount is less than 2', () => {
            getWrapper({ pageCount: 1, pageNumber: 1 });
            const previousPageButton = screen.queryByTitle(__('previous_page'));
            const nextPageButton = screen.queryByTitle(__('next_page'));

            expect(previousPageButton).toBeNull();
            expect(nextPageButton).toBeNull();
        });

        test('should return a valid wrapper', async () => {
            getWrapper();
            const previousPageButton = await getPreviousPageButton();
            const nextPageButton = await getNextPageButton();
            const pageControlsForm = await screen.findByTestId('bp-PageControlsForm');

            expect(previousPageButton).toBeInTheDocument();
            expect(nextPageButton).toBeInTheDocument();
            expect(pageControlsForm).toBeInTheDocument();
        });
    });
});
