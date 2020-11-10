import React from 'react';
import noop from 'lodash/noop';
import { shallow, ShallowWrapper } from 'enzyme';
import PageControls from '../PageControls';

describe('PageControls', () => {
    const getWrapper = (props = {}): ShallowWrapper =>
        shallow(
            <PageControls
                onPageChange={noop}
                pageCount={3}
                pageNumber={1}
                viewer={document.createElement('div')}
                {...props}
            />,
        );
    const getPreviousPage = (wrapper: ShallowWrapper): ShallowWrapper =>
        wrapper.find('[data-testid="bp-PageControls-previous"]');
    const getNextPage = (wrapper: ShallowWrapper): ShallowWrapper =>
        wrapper.find('[data-testid="bp-PageControls-next"]');

    describe('event handlers', () => {
        test('should handle previous page click', () => {
            const onPageChange = jest.fn();
            const wrapper = getWrapper({ onPageChange });

            getPreviousPage(wrapper).simulate('click');

            expect(onPageChange).toBeCalled();
        });

        test('should handle next page click', () => {
            const onPageChange = jest.fn();
            const wrapper = getWrapper({ onPageChange });

            getNextPage(wrapper).simulate('click');

            expect(onPageChange).toBeCalled();
        });
    });

    describe('render', () => {
        test('should render', () => {
            const onPageChange = jest.fn();
            getWrapper({ onPageChange });
        });
    });
});
