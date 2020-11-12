import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import noop from 'lodash/noop';
// import Browser from '../../../../Browser';
import PageControlsForm from '../PageControlsForm';
// import { BROWSERS } from '../../../../constants';

jest.mock('../../../../Browser', () => ({
    getName: jest.fn(),
}));

describe('PageControlsForm', () => {
    const getWrapper = (props = {}): ShallowWrapper =>
        shallow(
            <PageControlsForm
                getViewer={(): HTMLElement => document.createElement('div')}
                onPageChange={noop}
                pageCount={3}
                pageNumber={1}
                {...props}
            />,
        );
    const getFormButton = (wrapper: ShallowWrapper): ShallowWrapper =>
        wrapper.find('[data-testid="bp-PageControlsForm-button"]');
    const getFormInput = (wrapper: ShallowWrapper): ShallowWrapper =>
        wrapper.find('[data-testid="bp-PageControlsForm-input"]');

    describe('event handlers', () => {
        const onPageChange = jest.fn();
        const pageCount = 3;
        const pageNumber = 2;
        // const viewer = document.createElement('div');
        // const getViewer = (): HTMLElement => {
        //     viewer.focus = jest.fn();
        //     return viewer;
        // };

        test('should call onPageChange when input blurs', () => {
            const newPageNumber = 3;
            const wrapper = getWrapper({ onPageChange, pageCount, pageNumber });

            getFormButton(wrapper).simulate('click');
            getFormInput(wrapper).simulate('change', { target: { value: newPageNumber } });
            getFormInput(wrapper).simulate('blur');

            expect(onPageChange).toBeCalledWith(newPageNumber);
        });

        test('should not call onPageChange when input blurs with NaN', () => {
            const newPageNumber = '';
            const wrapper = getWrapper({ onPageChange, pageCount, pageNumber });

            getFormButton(wrapper).simulate('click');
            getFormInput(wrapper).simulate('change', { target: { value: newPageNumber } });
            getFormInput(wrapper).simulate('blur');

            expect(onPageChange).not.toHaveBeenCalled();
        });

        // test.each`
        //     key
        //     ${'Enter'}
        //     ${'Tab'}
        // `('should handle when $key is pressed on input and browser is not IE', ({ key }) => {
        //     const blur = jest.fn();
        //     const preventDefault = jest.fn();
        //     const stopPropagation = jest.fn();
        //     const wrapper = getWrapper({ getViewer });

        //     getFormButton(wrapper).simulate('click');
        //     getFormInput(wrapper).simulate('keydown', {
        //         preventDefault,
        //         stopPropagation,
        //         key,
        //         target: { blur },
        //     });

        //     expect(viewer.focus).toHaveBeenCalled();
        //     expect(blur).toHaveBeenCalled();
        //     expect(preventDefault).toHaveBeenCalled();
        //     expect(stopPropagation).toHaveBeenCalled();
        // });

        // test.each`
        //     key
        //     ${'Enter'}
        //     ${'Tab'}
        // `('should handle when $key is pressed on input and browser is IE', ({ key }) => {
        //     const blur = jest.fn();
        //     const preventDefault = jest.fn();
        //     const stopPropagation = jest.fn();
        //     const wrapper = getWrapper({ getViewer });

        //     getFormButton(wrapper).simulate('click');
        //     getFormInput(wrapper).simulate('keydown', {
        //         preventDefault,
        //         stopPropagation,
        //         key,
        //         target: { blur },
        //     });

        //     expect(viewer.focus).toHaveBeenCalled();
        //     expect(blur).not.toHaveBeenCalled();
        //     expect(preventDefault).toHaveBeenCalled();
        //     expect(stopPropagation).toHaveBeenCalled();
        // });

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
                key: 'Escape',
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
