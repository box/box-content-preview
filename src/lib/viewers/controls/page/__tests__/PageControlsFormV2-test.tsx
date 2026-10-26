import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import BlueprintProviders from '../../../../BlueprintProviders';
import ControlsLayerContext from '../../controls-layer/ControlsLayerContext';
import PageControlsFormV2 from '../PageControlsFormV2';
import { ControlsBarV2 } from '../../controls-bar';
import { ENTER, ESCAPE } from '../PageControlsForm';

describe('PageControlsFormV2', () => {
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <BlueprintProviders>
            <ControlsBarV2>{children}</ControlsBarV2>
        </BlueprintProviders>
    );
    const getWrapper = (props = {}) =>
        render(<PageControlsFormV2 onPageSubmit={jest.fn()} pageCount={3} pageNumber={1} {...props} />, {
            wrapper: Wrapper,
        });
    const getInput = () => screen.getByRole('textbox', { name: __('enter_page_num') });

    describe('event handlers', () => {
        test.each`
            newPageNumber | onPageSubmitCallCount
            ${2}          | ${1}
            ${''}         | ${0}
        `('should call onPageSubmit when input blurs', async ({ newPageNumber, onPageSubmitCallCount }) => {
            const user = userEvent.setup();
            const onPageSubmit = jest.fn();
            getWrapper({ onPageSubmit });

            await user.click(screen.getByRole('button', { name: '1 / 3' }));
            fireEvent.change(getInput(), { target: { value: newPageNumber } });
            fireEvent.blur(getInput());

            expect(onPageSubmit).toHaveBeenCalledTimes(onPageSubmitCallCount);
            expect(screen.getByRole('button', { name: '1 / 3' })).toBeInTheDocument();
            expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        });

        test.each`
            newPageNumber | onPageSubmitCallCount
            ${2}          | ${1}
            ${''}         | ${0}
        `('should handle when Enter key is pressed on input', async ({ onPageSubmitCallCount, newPageNumber }) => {
            const user = userEvent.setup();
            const onPageSubmit = jest.fn();
            getWrapper({ onPageSubmit });

            await user.click(screen.getByRole('button', { name: '1 / 3' }));
            fireEvent.change(getInput(), { target: { value: newPageNumber } });
            fireEvent.keyDown(getInput(), { key: ENTER });

            expect(onPageSubmit).toHaveBeenCalledTimes(onPageSubmitCallCount);
            expect(screen.getByRole('button', { name: '1 / 3' })).toBeInTheDocument();
            expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        });

        test('should tell the controls layer it is editing while the input is shown', async () => {
            const user = userEvent.setup();
            const setIsEditing = jest.fn();

            render(
                <ControlsLayerContext.Provider value={{ setIsEditing, setIsForced: jest.fn() }}>
                    <PageControlsFormV2 onPageSubmit={jest.fn()} pageCount={3} pageNumber={1} />
                </ControlsLayerContext.Provider>,
                { wrapper: Wrapper },
            );

            expect(setIsEditing).toHaveBeenLastCalledWith(false);

            await user.click(screen.getByRole('button', { name: '1 / 3' }));

            expect(setIsEditing).toHaveBeenLastCalledWith(true);

            fireEvent.keyDown(getInput(), { key: ESCAPE });

            expect(setIsEditing).toHaveBeenLastCalledWith(false);
        });

        test('should submit the typed page number', async () => {
            const user = userEvent.setup();
            const onPageSubmit = jest.fn();
            getWrapper({ onPageSubmit });

            await user.click(screen.getByRole('button', { name: '1 / 3' }));
            await user.clear(getInput());
            await user.type(getInput(), '3{Enter}');

            expect(onPageSubmit).toHaveBeenCalledWith(3);
        });

        test.each(['0', '4', '-1', 'abc', '2abc', '2.5', '', '1'])(
            'should not submit and should reset the input if the value is %s',
            async newPageNumber => {
                const user = userEvent.setup();
                const onPageSubmit = jest.fn();
                getWrapper({ onPageSubmit });

                await user.click(screen.getByRole('button', { name: '1 / 3' }));
                fireEvent.change(getInput(), { target: { value: newPageNumber } });
                fireEvent.keyDown(getInput(), { key: ENTER });

                expect(onPageSubmit).not.toHaveBeenCalled();

                await user.click(screen.getByRole('button', { name: '1 / 3' }));

                expect(getInput()).toHaveValue('1');
            },
        );

        test('should return focus to the button if Enter is pressed with an invalid value', async () => {
            const user = userEvent.setup();
            getWrapper();

            await user.click(screen.getByRole('button', { name: '1 / 3' }));
            fireEvent.change(getInput(), { target: { value: '4' } });
            fireEvent.keyDown(getInput(), { key: ENTER });

            expect(screen.getByRole('button', { name: '1 / 3' })).toHaveFocus();
        });

        test('should not move focus to the button if the input blurs with an invalid value', async () => {
            const user = userEvent.setup();
            getWrapper();

            await user.click(screen.getByRole('button', { name: '1 / 3' }));
            fireEvent.change(getInput(), { target: { value: '4' } });
            fireEvent.blur(getInput());

            expect(screen.getByRole('button', { name: '1 / 3' })).not.toHaveFocus();
        });

        test('should handle Escape key when pressed on input', async () => {
            const user = userEvent.setup();
            const onPageSubmit = jest.fn();
            getWrapper({ onPageSubmit });

            await user.click(screen.getByRole('button', { name: '1 / 3' }));
            fireEvent.change(getInput(), { target: { value: '2' } });
            fireEvent.keyDown(getInput(), { key: ESCAPE });

            expect(onPageSubmit).not.toHaveBeenCalled();
            expect(screen.getByRole('button', { name: '1 / 3' })).toHaveFocus();
            expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

            await user.click(screen.getByRole('button', { name: '1 / 3' }));

            expect(getInput()).toHaveValue('1');
        });

        test.each([ENTER, ESCAPE])('should stop the %s key from propagating', async key => {
            const user = userEvent.setup();
            const onKeyDown = jest.fn();
            getWrapper();

            await user.click(screen.getByRole('button', { name: '1 / 3' }));
            document.addEventListener('keydown', onKeyDown);
            fireEvent.keyDown(getInput(), { key });
            document.removeEventListener('keydown', onKeyDown);

            expect(onKeyDown).not.toHaveBeenCalled();
        });

        test('should let other keys propagate', async () => {
            const user = userEvent.setup();
            const onKeyDown = jest.fn();
            getWrapper();

            await user.click(screen.getByRole('button', { name: '1 / 3' }));
            document.addEventListener('keydown', onKeyDown);
            fireEvent.keyDown(getInput(), { key: '2' });
            document.removeEventListener('keydown', onKeyDown);

            expect(onKeyDown).toHaveBeenCalled();
            expect(getInput()).toBeInTheDocument();
        });
    });

    describe('render', () => {
        test('should render button with correct page number', () => {
            getWrapper({ pageNumber: 2 });

            expect(screen.getByRole('button', { name: '2 / 3' })).toBeInTheDocument();
            expect(screen.getByTestId('bp-PageControlsForm-button-label')).toHaveTextContent('2 / 3');
        });

        test('should render disabled button when pageCount is 1', () => {
            getWrapper({ pageCount: 1 });

            expect(screen.getByRole('button', { name: '1 / 1' })).toBeDisabled();
        });

        test('should render input with the current page selected when button is clicked', async () => {
            const user = userEvent.setup();
            getWrapper({ pageCount: 12, pageNumber: 10 });

            expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

            await user.click(screen.getByRole('button', { name: '10 / 12' }));

            const input = getInput() as HTMLInputElement;

            expect(screen.queryByRole('button', { name: '10 / 12' })).not.toBeInTheDocument();
            expect(input).toHaveValue('10');
            expect(input.selectionStart).toBe(0);
            expect(input.selectionEnd).toBe(2);
        });

        test('should keep the input value in sync with the pageNumber prop', async () => {
            const user = userEvent.setup();
            const { rerender } = getWrapper({ pageNumber: 1 });

            rerender(<PageControlsFormV2 onPageSubmit={jest.fn()} pageCount={3} pageNumber={2} />);
            await user.click(screen.getByRole('button', { name: '2 / 3' }));

            expect(getInput()).toHaveValue('2');
        });

        test('should keep the resin targets and test ids of the legacy page form', async () => {
            const user = userEvent.setup();
            getWrapper();

            const button = screen.getByRole('button', { name: '1 / 3' });

            expect(screen.getByTestId('bp-PageControlsForm')).toBeInTheDocument();
            expect(button).toHaveAttribute('data-resin-target', 'pageNumberOpen');
            expect(button).toHaveAttribute('data-testid', 'bp-PageControlsForm-button');

            await user.click(button);

            expect(getInput()).toHaveAttribute('data-resin-target', 'pageNumberInput');
            expect(getInput()).toHaveAttribute('data-testid', 'bp-PageControlsForm-input');
        });
    });
});
