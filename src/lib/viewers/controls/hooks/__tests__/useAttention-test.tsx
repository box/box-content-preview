import * as React from 'react';
import { act } from 'react-dom/test-utils';
import { mount, ReactWrapper } from 'enzyme';
import useAttention from '../useAttention';

describe('useAttention', () => {
    function TestComponent(): JSX.Element {
        const [isActive, handlers] = useAttention();
        return <div className={isActive ? 'active' : ''} {...handlers} />;
    }

    const getElement = (wrapper: ReactWrapper): ReactWrapper => wrapper.childAt(0);
    const getWrapper = (): ReactWrapper => mount(<TestComponent />);

    test('should return isActive based on focus and/or hover state', () => {
        const wrapper = getWrapper();
        const simulate = (event: string): void => {
            act(() => {
                wrapper.simulate(event);
            });
            wrapper.update();
        };

        expect(getElement(wrapper).hasClass('active')).toBe(false); // Default

        simulate('focus');
        expect(getElement(wrapper).hasClass('active')).toBe(true); // Focus

        simulate('mouseover');
        expect(getElement(wrapper).hasClass('active')).toBe(true); // Focus & Hover

        simulate('blur');
        expect(getElement(wrapper).hasClass('active')).toBe(true); // Hover

        simulate('mouseout');
        expect(getElement(wrapper).hasClass('active')).toBe(false); // Default
    });
});
