import React from 'react';
import noop from 'lodash/noop';
import { shallow, ShallowWrapper } from 'enzyme';
import PageControls from '../PageControls';
import PageControlsForm from '../PageControlsForm';

describe('PageControls', () => {
    const getWrapper = (props = {}): ShallowWrapper =>
        shallow(
            <PageControls
                getViewer={(): HTMLElement => document.createElement('div')}
                onPageChange={noop}
                pageCount={3}
                pageNumber={1}
                {...props}
            />,
        );
    const getPreviousPageButton = (wrapper: ShallowWrapper): ShallowWrapper =>
        wrapper.find('[data-testid="bp-PageControls-previous"]');
    const getNextPageButton = (wrapper: ShallowWrapper): ShallowWrapper =>
        wrapper.find('[data-testid="bp-PageControls-next"]');

    describe('event handlers', () => {
        test('should handle previous page click', () => {
            const pageNumber = 2;
            const pageCount = 3;
            const onPageChange = jest.fn();
            const wrapper = getWrapper({ onPageChange, pageCount, pageNumber });

            getPreviousPageButton(wrapper).simulate('click');

            expect(onPageChange).toBeCalledWith(1);
        });

        test('should handle next page click', () => {
            const pageNumber = 2;
            const pageCount = 3;
            const onPageChange = jest.fn();
            const wrapper = getWrapper({ onPageChange, pageCount, pageNumber });

            getNextPageButton(wrapper).simulate('click');

            expect(onPageChange).toBeCalledWith(3);
        });
    });

    describe('render', () => {
        test('should not be able to use previous button if on first page ', () => {
            const pageNumber = 1;
            const pageCount = 3;
            const wrapper = getWrapper({ pageCount, pageNumber });

            expect(getPreviousPageButton(wrapper).prop('disabled')).toBe(true);
        });

        test('should not be able to use next button if on last page', () => {
            const pageNumber = 3;
            const pageCount = 3;
            const wrapper = getWrapper({ pageCount, pageNumber });

            expect(getNextPageButton(wrapper).prop('disabled')).toBe(true);
        });

        test('should return a valid wrapper', () => {
            const wrapper = getWrapper();

            expect(getPreviousPageButton(wrapper)).toBeDefined();
            expect(getNextPageButton(wrapper)).toBeDefined();
            expect(wrapper.find(PageControlsForm)).toBeDefined();
            expect(wrapper.hasClass('bp-PageControls')).toBe(true);
        });
    });
});
