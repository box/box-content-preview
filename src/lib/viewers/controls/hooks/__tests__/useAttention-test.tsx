import * as React from 'react';
import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import useAttention from '../useAttention';

describe('useAttention', () => {
    function TestComponent(): React.JSX.Element {
        const [isActive, handlers] = useAttention();
        return (
            <div className={isActive ? 'active' : ''} data-testid="test-div" {...handlers}>
                <button type="button">child</button>
            </div>
        );
    }

    test('should return isActive based on hover state', async () => {
        const user = userEvent.setup();
        render(<TestComponent />);
        const element = screen.getByTestId('test-div');

        expect(element).not.toHaveClass('active');

        await user.hover(element);
        expect(element).toHaveClass('active');

        await user.unhover(element);
        expect(element).not.toHaveClass('active');
    });

    test('should stay active when focus moves to a child', async () => {
        const user = userEvent.setup();
        render(<TestComponent />);
        const element = screen.getByTestId('test-div');
        const child = screen.getByRole('button', { name: 'child' });

        await user.tab();
        expect(child).toHaveFocus();
        expect(element).toHaveClass('active');
    });

    test('should ignore blur when relatedTarget is inside the current target', () => {
        const { result } = renderHook(() => useAttention());
        const currentTarget = document.createElement('div');
        const relatedTarget = document.createElement('button');
        currentTarget.appendChild(relatedTarget);

        act(() => {
            result.current[1].onFocus();
        });
        act(() => {
            result.current[1].onBlur(({ currentTarget, relatedTarget } as unknown) as React.FocusEvent<HTMLElement>);
        });

        expect(result.current[0]).toBe(true);
    });
});
