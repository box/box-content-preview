import * as React from 'react';
import noop from 'lodash/noop';
import { mount, ReactWrapper } from 'enzyme';
import useClickOutside from '../useClickOutside';

describe('useClickOutside', () => {
    function TestComponent({ callback = noop }: { callback?: () => void }): JSX.Element {
        const ref = React.createRef<HTMLButtonElement>();

        useClickOutside(ref, callback);

        return (
            <div id="container">
                <button ref={ref} id="test-button" type="button">
                    <span id="test-span">Test</span>
                </button>
            </div>
        );
    }

    const getWrapper = (props: { callback?: () => void }): ReactWrapper =>
        mount(
            <div>
                <TestComponent {...props} />
            </div>,
            { attachTo: document.getElementById('test') },
        );

    beforeEach(() => {
        document.body.innerHTML = '<div id="test"></div>';
    });

    test.each`
        elementId        | isCalled
        ${'test'}        | ${true}
        ${'container'}   | ${true}
        ${'test-button'} | ${false}
        ${'test-span'}   | ${false}
    `('should callback be called if click target is $elementId? $isCalled', ({ elementId, isCalled }) => {
        const callback = jest.fn();
        getWrapper({ callback });

        const element: HTMLElement | null = document.getElementById(elementId);
        if (element) {
            element.click();
        }

        expect(element).toBeDefined();
        expect(callback.mock.calls.length).toBe(isCalled ? 1 : 0);
    });
});
