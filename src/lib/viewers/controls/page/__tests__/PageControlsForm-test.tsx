import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import noop from 'lodash/noop';
import PageControlsForm, { ENTER, ESCAPE } from '../PageControlsForm';

jest.mock('../../../../Browser', () => ({
    getName: jest.fn(),
}));

describe('PageControlsForm', () => {
    const getWrapper = (props = {}): ShallowWrapper =>
        shallow(<PageControlsForm onPageSubmit={noop} pageCount={3} pageNumber={1} {...props} />);
    const getFormButton = (wrapper: ShallowWrapper): ShallowWrapper =>
        wrapper.find('[data-testid="bp-PageControlsForm-button"]');
    const getFormInput = (wrapper: ShallowWrapper): ShallowWrapper =>
        wrapper.find('[data-testid="bp-PageControlsForm-input"]');

    describe('event handlers', () => {
        const onPageSubmit = jest.fn();
        const pageCount = 3;
        const pageNumber = 2;

        afterEach(() => {
            jest.resetAllMocks();
        });

        test('should call onPageSubmit when input blurs', () => {
            const newPageNumber = 3;
            const wrapper = getWrapper({ onPageSubmit, pageCount, pageNumber });

            getFormButton(wrapper).simulate('click');
            getFormInput(wrapper).simulate('change', { target: { value: newPageNumber } });
            getFormInput(wrapper).simulate('blur');

            expect(onPageSubmit).toBeCalledWith(newPageNumber);
        });

        test('should not call onPageSubmit when input blurs with NaN', () => {
            const newPageNumber = '';
            const wrapper = getWrapper({ onPageSubmit, pageCount, pageNumber });

            getFormButton(wrapper).simulate('click');
            getFormInput(wrapper).simulate('change', { target: { value: newPageNumber } });
            getFormInput(wrapper).simulate('blur');

            expect(onPageSubmit).not.toHaveBeenCalled();
        });

        test('should handle when Enter key is pressed on input and new page number is valid', () => {
            const key = ENTER;
            const newPageNumber = 2;
            const preventDefault = jest.fn();
            const stopPropagation = jest.fn();
            const wrapper = getWrapper({ onPageSubmit });
            const initialFormButton = getFormButton(wrapper);
            const initialFormInput = getFormInput(wrapper);

            getFormButton(wrapper).simulate('click');
            const intermediaryFormButton = getFormButton(wrapper);
            const intermediaryFormInput = getFormInput(wrapper);
            getFormInput(wrapper).simulate('change', {
                preventDefault,
                stopPropagation,
                target: { value: newPageNumber.toString() },
            });
            getFormInput(wrapper).simulate('keydown', {
                preventDefault,
                stopPropagation,
                key,
                target: { value: newPageNumber.toString() },
            });

            expect(preventDefault).toHaveBeenCalled();
            expect(stopPropagation).toHaveBeenCalled();
            expect(onPageSubmit).toHaveBeenCalledWith(newPageNumber);
            expect(initialFormButton.length).toBe(1);
            expect(initialFormInput.length).toBe(0);
            expect(intermediaryFormButton.length).toBe(0);
            expect(intermediaryFormInput.length).toBe(1);
            expect(getFormButton(wrapper).length).toBe(1);
            expect(getFormInput(wrapper).length).toBe(0);
        });

        test('should handle when Enter key is pressed on input and new page number is invalid', () => {
            const key = ENTER;
            const newPageNumber = '';
            const preventDefault = jest.fn();
            const stopPropagation = jest.fn();
            const wrapper = getWrapper({ onPageSubmit });
            const initialFormButton = getFormButton(wrapper);
            const initialFormInput = getFormInput(wrapper);

            getFormButton(wrapper).simulate('click');
            const intermediaryFormButton = getFormButton(wrapper);
            const intermediaryFormInput = getFormInput(wrapper);
            getFormInput(wrapper).simulate('change', {
                preventDefault,
                stopPropagation,
                target: { value: newPageNumber.toString() },
            });
            getFormInput(wrapper).simulate('keydown', {
                preventDefault,
                stopPropagation,
                key,
            });

            expect(preventDefault).toHaveBeenCalled();
            expect(stopPropagation).toHaveBeenCalled();
            expect(onPageSubmit).not.toHaveBeenCalled();
            expect(initialFormButton.length).toBe(1);
            expect(initialFormInput.length).toBe(0);
            expect(intermediaryFormButton.length).toBe(0);
            expect(intermediaryFormInput.length).toBe(1);
            expect(getFormButton(wrapper).length).toBe(1);
            expect(getFormInput(wrapper).length).toBe(0);
        });

        test('should handle escape key when pressed on input', () => {
            const preventDefault = jest.fn();
            const stopPropagation = jest.fn();
            const wrapper = getWrapper();
            const initialFormButton = getFormButton(wrapper);
            const initialFormInput = getFormInput(wrapper);

            getFormButton(wrapper).simulate('click');
            const intermediaryFormButton = getFormButton(wrapper);
            const intermediaryFormInput = getFormInput(wrapper);
            getFormInput(wrapper).simulate('keydown', {
                preventDefault,
                stopPropagation,
                key: ESCAPE,
            });

            expect(preventDefault).toHaveBeenCalled();
            expect(stopPropagation).toHaveBeenCalled();
            expect(initialFormButton.length).toBe(1);
            expect(initialFormInput.length).toBe(0);
            expect(intermediaryFormButton.length).toBe(0);
            expect(intermediaryFormInput.length).toBe(1);
            expect(getFormButton(wrapper).length).toBe(1);
            expect(getFormInput(wrapper).length).toBe(0);
        });
    });

    describe('render', () => {
        test('should render button with correct page number', () => {
            const pageCount = 3;
            const pageNumber = 2;

            const wrapper = getWrapper({ pageCount: 3, pageNumber: 2 });

            expect(getFormButton(wrapper).text()).toEqual(`${pageNumber} / ${pageCount}`);
        });

        test('should render input when button is clicked', () => {
            const wrapper = getWrapper();
            const initialFormButton = getFormButton(wrapper);
            const initialFormInput = getFormInput(wrapper);

            getFormButton(wrapper).simulate('click');

            expect(initialFormButton.length).toBe(1);
            expect(initialFormInput.length).toBe(0);
            expect(getFormButton(wrapper).length).toBe(0);
            expect(getFormInput(wrapper).length).toBe(1);
        });
    });
});
