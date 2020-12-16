import * as React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import usePreventKey from '../usePreventKey';

describe('usePreventKey', () => {
    function TestComponent({ keys }: { keys?: string[] }): JSX.Element {
        const ref = React.useRef<HTMLDivElement>(null);
        usePreventKey(ref, keys);
        return <div ref={ref} />;
    }

    const getElement = (wrapper: ReactWrapper): HTMLDivElement => wrapper.childAt(0).getDOMNode();
    const getEvent = (options = {}): KeyboardEvent => {
        const event = new KeyboardEvent('keydown', options);
        event.stopPropagation = jest.fn();
        return event;
    };
    const getWrapper = (props = {}): ReactWrapper => mount(<TestComponent {...props} />);

    test('should stop propagation of a matching event triggered on the provided element', () => {
        const wrapper = getWrapper({ keys: ['Enter'] });
        const element = getElement(wrapper);
        const enterEvent = getEvent({ key: 'Enter' });
        const escapeEvent = getEvent({ key: 'Escape' });

        element.dispatchEvent(enterEvent);
        expect(enterEvent.stopPropagation).toBeCalled();

        element.dispatchEvent(escapeEvent);
        expect(escapeEvent.stopPropagation).not.toBeCalled();
    });
});
