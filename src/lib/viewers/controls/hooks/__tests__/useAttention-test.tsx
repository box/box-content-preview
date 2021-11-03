import * as React from 'react';
import { act } from 'react-dom/test-utils';
import { mount, ReactWrapper } from 'enzyme';
import useAttention, { AttentionHandlers } from '../useAttention';

describe('useAttention', () => {
    function TestComponent(attentionHandlers: Partial<AttentionHandlers> = {}): JSX.Element {
        const [isActive, handlers] = useAttention(attentionHandlers);
        return <div className={isActive ? 'active' : ''} {...handlers} />;
    }

    const getElement = (wrapper: ReactWrapper): ReactWrapper => wrapper.childAt(0);
    const getWrapper = (props?: Partial<AttentionHandlers>): ReactWrapper => mount(<TestComponent {...props} />);

    test('should return isActive based on focus and/or hover state', () => {
        const onBlur = jest.fn();
        const onFocus = jest.fn();
        const onMouseOut = jest.fn();
        const onMouseOver = jest.fn();

        const wrapper = getWrapper({ onBlur, onFocus, onMouseOut, onMouseOver });
        const simulate = (event: string): void => {
            act(() => {
                wrapper.simulate(event);
            });
            wrapper.update();
        };

        expect(getElement(wrapper).hasClass('active')).toBe(false); // Default

        simulate('focus');
        expect(onFocus).toBeCalled();
        expect(getElement(wrapper).hasClass('active')).toBe(true); // Focus

        simulate('mouseover');
        expect(onMouseOver).toBeCalled();
        expect(getElement(wrapper).hasClass('active')).toBe(true); // Focus & Hover

        simulate('blur');
        expect(onBlur).toBeCalled();
        expect(getElement(wrapper).hasClass('active')).toBe(true); // Hover

        simulate('mouseout');
        expect(onMouseOut).toBeCalled();
        expect(getElement(wrapper).hasClass('active')).toBe(false); // Default
    });
});
