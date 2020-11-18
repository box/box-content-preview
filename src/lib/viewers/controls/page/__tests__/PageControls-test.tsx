import React from 'react';
import noop from 'lodash/noop';
import { shallow, ShallowWrapper } from 'enzyme';
import PageControls from '../PageControls';
import PageControlsForm from '../PageControlsForm';

describe('PageControls', () => {
    const getWrapper = (props = {}): ShallowWrapper =>
        shallow(<PageControls onPageChange={noop} onPageSubmit={noop} pageCount={3} pageNumber={1} {...props} />);
    const getPreviousPageButton = (wrapper: ShallowWrapper): ShallowWrapper =>
        wrapper.find('[data-testid="bp-PageControls-previous"]');
    const getNextPageButton = (wrapper: ShallowWrapper): ShallowWrapper =>
        wrapper.find('[data-testid="bp-PageControls-next"]');

    describe('event handlers', () => {
        test('should handle previous page click', () => {
            const pageNumber = 2;
            const onPageChange = jest.fn();
            const wrapper = getWrapper({ onPageChange, pageCount: 3, pageNumber });

            getPreviousPageButton(wrapper).simulate('click');

            expect(onPageChange).toBeCalledWith(pageNumber - 1);
        });

        test('should handle next page click', () => {
            const pageNumber = 2;
            const onPageChange = jest.fn();
            const wrapper = getWrapper({ onPageChange, pageCount: 3, pageNumber });

            getNextPageButton(wrapper).simulate('click');

            expect(onPageChange).toBeCalledWith(pageNumber + 1);
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
            ({ pageNumber, isNextButtonDisabled, isPrevButtonDisabled }) => {
                const wrapper = getWrapper({ pageCount: 3, pageNumber });

                expect(getPreviousPageButton(wrapper).prop('disabled')).toBe(isPrevButtonDisabled);
                expect(getNextPageButton(wrapper).prop('disabled')).toBe(isNextButtonDisabled);
            },
        );

        test('should return a valid wrapper', () => {
            const wrapper = getWrapper();

            expect(getPreviousPageButton(wrapper).exists()).toBe(true);
            expect(getNextPageButton(wrapper).exists()).toBe(true);
            expect(wrapper.find(PageControlsForm).exists()).toBe(true);
            expect(wrapper.hasClass('bp-PageControls')).toBe(true);
        });
    });
});
