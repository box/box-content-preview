import * as React from 'react';
import noop from 'lodash/noop';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import useClickOutside from '../useClickOutside';

describe('useClickOutside', () => {
    function TestComponent({ callback = noop }: { callback?: () => void }): React.JSX.Element {
        const ref = React.createRef<HTMLButtonElement>();

        useClickOutside(ref, callback);

        return (
            <div data-testid="container">
                <button ref={ref} data-testid="test-button" type="button">
                    <span data-testid="test-span">Test</span>
                </button>
            </div>
        );
    }

    const getWrapper = (props = {}) => render(<TestComponent {...props} />);

    test.each`
        elementId        | isCalled
        ${'container'}   | ${true}
        ${'test-button'} | ${false}
        ${'test-span'}   | ${false}
    `('should callback be called if click target is $elementId? $isCalled', async ({ elementId, isCalled }) => {
        const callback = jest.fn();
        getWrapper({ callback });

        const element = await screen.findByTestId(elementId);
        await userEvent.click(element);

        if (isCalled) {
            expect(callback).toHaveBeenCalled();
        } else {
            expect(callback).not.toHaveBeenCalled();
        }
    });
});
