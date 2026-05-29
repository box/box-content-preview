import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import useKeyboardShortcuts, { KeyboardShortcutMap } from '../useKeyboardShortcuts';

function Harness({ shortcuts, enabled }: { shortcuts: KeyboardShortcutMap; enabled?: boolean }): React.ReactElement {
    useKeyboardShortcuts(shortcuts, { enabled });
    return (
        <div>
            <input data-testid="text-input" />
            <textarea data-testid="text-area" />
        </div>
    );
}

describe('useKeyboardShortcuts', () => {
    test('fires the matching action on keydown', () => {
        const action = jest.fn();
        render(<Harness shortcuts={{ '+': action }} />);
        fireEvent.keyDown(window, { key: '+' });
        expect(action).toHaveBeenCalledTimes(1);
    });

    test('matches modifier+key combinations', () => {
        const action = jest.fn();
        render(<Harness shortcuts={{ 'cmd+f': action }} />);
        fireEvent.keyDown(window, { key: 'f', metaKey: true });
        expect(action).toHaveBeenCalledTimes(1);
    });

    test('does not fire when typing in an input', () => {
        const action = jest.fn();
        render(<Harness shortcuts={{ '+': action }} />);
        const input = screen.getByTestId('text-input');
        input.focus();
        fireEvent.keyDown(input, { key: '+' });
        expect(action).not.toHaveBeenCalled();
    });

    test('does not fire when typing in a textarea', () => {
        const action = jest.fn();
        render(<Harness shortcuts={{ '+': action }} />);
        const ta = screen.getByTestId('text-area');
        ta.focus();
        fireEvent.keyDown(ta, { key: '+' });
        expect(action).not.toHaveBeenCalled();
    });

    test('respects enabled=false', () => {
        const action = jest.fn();
        render(<Harness enabled={false} shortcuts={{ '+': action }} />);
        fireEvent.keyDown(window, { key: '+' });
        expect(action).not.toHaveBeenCalled();
    });
});
