import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import PageControlsForm, { ENTER, ESCAPE } from '../PageControlsForm';

describe('PageControlsForm', () => {
    const renderView = (props = {}) =>
        render(<PageControlsForm onPageSubmit={jest.fn()} pageCount={3} pageNumber={1} {...props} />);

    describe('event handlers', () => {
        test.each`
            newPageNumber | onPageSubmitCallCount
            ${2}          | ${1}
            ${''}         | ${0}
        `('should call onPageSubmit when input blurs', async ({ newPageNumber, onPageSubmitCallCount }) => {
            const onPageSubmit = jest.fn();
            renderView({ onPageSubmit, pageCount: 3, pageNumber: 1 });

            expect(screen.getByTitle('Click to enter page number')).toBe(screen.getByRole('button', { name: '1 / 3' }));

            await userEvent.click(screen.getByRole('button', { name: '1 / 3' }));

            expect(screen.getByTitle('Click to enter page number')).toBe(screen.getByRole('spinbutton'));

            fireEvent.change(screen.getByRole('spinbutton'), { target: { value: newPageNumber } });
            fireEvent.blur(screen.getByRole('spinbutton'));

            expect(onPageSubmit).toHaveBeenCalledTimes(onPageSubmitCallCount);
        });

        test.each`
            newPageNumber | onPageSubmitCallCount
            ${2}          | ${1}
            ${''}         | ${0}
        `('should handle when Enter key is pressed on input', async ({ onPageSubmitCallCount, newPageNumber }) => {
            const onPageSubmit = jest.fn();
            renderView({ onPageSubmit, pageCount: 3, pageNumber: 1 });

            await userEvent.click(screen.getByRole('button', { name: '1 / 3' }));
            fireEvent.change(screen.getByRole('spinbutton'), { target: { value: newPageNumber } });
            fireEvent.keyDown(screen.getByRole('spinbutton'), {
                key: ENTER,
            });

            expect(onPageSubmit).toHaveBeenCalledTimes(onPageSubmitCallCount);
            expect(screen.getByRole('button', { name: '1 / 3' })).toBeInTheDocument();
            expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
        });

        test('should handle Escape key when pressed on input', async () => {
            renderView();

            await userEvent.click(screen.getByRole('button', { name: '1 / 3' }));
            fireEvent.keyDown(screen.getByRole('spinbutton'), {
                key: ESCAPE,
            });

            expect(screen.getByRole('button', { name: '1 / 3' })).toBeInTheDocument();
            expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
        });
    });

    describe('render', () => {
        test('should render button with correct page number', () => {
            renderView({ pageCount: 3, pageNumber: 2 });

            expect(screen.getByRole('button', { name: '2 / 3' })).toBeInTheDocument();
        });

        test('should render disabled button when pageCount is 1', () => {
            renderView({ pageCount: 1, pageNumber: 1 });

            expect(screen.getByRole('button', { name: '1 / 1' })).toHaveAttribute('disabled');
        });

        test('should render input when button is clicked', async () => {
            renderView();

            expect(screen.getByRole('button', { name: '1 / 3' })).toBeInTheDocument();
            expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();

            await userEvent.click(screen.getByRole('button', { name: '1 / 3' }));

            expect(screen.queryByRole('button', { name: '1 / 3' })).not.toBeInTheDocument();
            expect(screen.getByRole('spinbutton')).toBeInTheDocument();
        });
    });
});
