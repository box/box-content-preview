import React from 'react';
import noop from 'lodash/noop';
import { shallow, ShallowWrapper } from 'enzyme';
import PageControlsForm, { ENTER, ESCAPE } from '../PageControlsForm';

describe('PageControlsForm', () => {
    const getWrapper = (props = {}): ShallowWrapper =>
        shallow(<PageControlsForm onPageSubmit={noop} pageCount={3} pageNumber={1} {...props} />);
    const getFormButton = (wrapper: ShallowWrapper): ShallowWrapper =>
        wrapper.find('[data-testid="bp-PageControlsForm-button"]');
    const getFormInput = (wrapper: ShallowWrapper): ShallowWrapper =>
        wrapper.find('[data-testid="bp-PageControlsForm-input"]');

    describe('event handlers', () => {
        test.each`
            newPageNumber | onPageSubmitCallCount
            ${2}          | ${1}
            ${''}         | ${0}
        `('should call onPageSubmit when input blurs', ({ newPageNumber, onPageSubmitCallCount }) => {
            const onPageSubmit = jest.fn();
            const wrapper = getWrapper({ onPageSubmit, pageCount: 3, pageNumber: 1 });

            getFormButton(wrapper).simulate('click');
            getFormInput(wrapper).simulate('change', { target: { value: newPageNumber } });
            getFormInput(wrapper).simulate('blur');

            expect(onPageSubmit).toBeCalledTimes(onPageSubmitCallCount);
        });

        test.each`
            newPageNumber | onPageSubmitCallCount
            ${2}          | ${1}
            ${''}         | ${0}
        `('should handle when Enter key is pressed on input', ({ onPageSubmitCallCount, newPageNumber }) => {
            const onPageSubmit = jest.fn();
            const preventDefault = jest.fn();
            const stopPropagation = jest.fn();
            const wrapper = getWrapper({ onPageSubmit, pageCount: 3, pageNumber: 1 });

            getFormButton(wrapper).simulate('click');

            expect(getFormButton(wrapper).exists()).toBe(false);
            expect(getFormInput(wrapper).exists()).toBe(true);

            getFormInput(wrapper).simulate('change', {
                target: { value: newPageNumber },
            });
            getFormInput(wrapper).simulate('keydown', {
                preventDefault,
                stopPropagation,
                key: ENTER,
            });

            expect(preventDefault).toHaveBeenCalled();
            expect(stopPropagation).toHaveBeenCalled();
            expect(onPageSubmit).toBeCalledTimes(onPageSubmitCallCount);
            expect(getFormButton(wrapper).exists()).toBe(true);
            expect(getFormInput(wrapper).exists()).toBe(false);
        });

        test('should handle Escape key when pressed on input', () => {
            const preventDefault = jest.fn();
            const stopPropagation = jest.fn();
            const wrapper = getWrapper();

            expect(getFormButton(wrapper).exists()).toBe(true);
            expect(getFormInput(wrapper).exists()).toBe(false);

            getFormButton(wrapper).simulate('click');

            expect(getFormButton(wrapper).exists()).toBe(false);
            expect(getFormInput(wrapper).exists()).toBe(true);

            getFormInput(wrapper).simulate('keydown', {
                preventDefault,
                stopPropagation,
                key: ESCAPE,
            });

            expect(preventDefault).toHaveBeenCalled();
            expect(stopPropagation).toHaveBeenCalled();
            expect(getFormButton(wrapper).exists()).toBe(true);
            expect(getFormInput(wrapper).exists()).toBe(false);
        });
    });

    describe('render', () => {
        test('should render button with correct page number', () => {
            const pageCount = 3;
            const pageNumber = 2;

            const wrapper = getWrapper({ pageCount, pageNumber });

            expect(getFormButton(wrapper).text()).toEqual(`${pageNumber} / ${pageCount}`);
        });

        test('should render disabled button when pageCount is 1', () => {
            const wrapper = getWrapper({ pageCount: 1, pageNumber: 1 });

            expect(getFormButton(wrapper).prop('disabled')).toBe(true);
        });

        test('should render input when button is clicked', () => {
            const wrapper = getWrapper();

            expect(getFormButton(wrapper).exists()).toBe(true);
            expect(getFormInput(wrapper).exists()).toBe(false);

            getFormButton(wrapper).simulate('click');

            expect(getFormButton(wrapper).exists()).toBe(false);
            expect(getFormInput(wrapper).exists()).toBe(true);
        });
    });
});
