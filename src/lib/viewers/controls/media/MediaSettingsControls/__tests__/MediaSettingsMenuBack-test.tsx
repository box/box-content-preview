import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import IconArrowLeft24 from '../../../icons/IconArrowLeft24';
import MediaSettingsContext, { Context } from '../MediaSettingsContext';
import MediaSettingsMenuBack from '../MediaSettingsMenuBack';

describe('MediaSettingsMenuBack', () => {
    const getContext = (): Partial<Context> => ({ setActiveMenu: jest.fn() });
    const getWrapper = (props = {}, context = {}): ReactWrapper =>
        mount(<MediaSettingsMenuBack label="Autoplay" {...props} />, {
            wrappingComponent: MediaSettingsContext.Provider,
            wrappingComponentProps: { value: context },
        });

    describe('event handlers', () => {
        test('should set the active menu when clicked', () => {
            const context = getContext();
            const wrapper = getWrapper({}, context);

            wrapper.simulate('click');

            expect(context.setActiveMenu).toBeCalled();
        });

        test.each`
            key            | calledTimes
            ${'ArrowLeft'} | ${1}
            ${'Enter'}     | ${1}
            ${'Escape'}    | ${0}
            ${'Space'}     | ${1}
        `('should set the active menu $calledTimes times when $key is pressed', ({ key, calledTimes }) => {
            const context = getContext();
            const wrapper = getWrapper({}, context);

            wrapper.simulate('keydown', { key });

            expect(context.setActiveMenu).toBeCalledTimes(calledTimes);
        });
    });

    describe('render', () => {
        test('should return a valid wrapper', () => {
            const wrapper = getWrapper();

            expect(wrapper.getDOMNode()).toHaveClass('bp-MediaSettingsMenuBack');
            expect(wrapper.find('.bp-MediaSettingsMenuBack-label').contains('Autoplay')).toBe(true);
            expect(wrapper.exists(IconArrowLeft24)).toBe(true);
        });
    });
});
