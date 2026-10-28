import React from 'react';
import { act, render, screen } from '@testing-library/react';
import useMediaQuery from '../useMediaQuery';

describe('useMediaQuery', () => {
    const originalMatchMedia = window.matchMedia;
    let listeners: Set<() => void>;
    let matches: boolean;

    function TestComponent(): JSX.Element {
        return <div data-testid="test-div">{useMediaQuery('(min-width: 768px)') ? 'match' : 'no match'}</div>;
    }

    beforeEach(() => {
        listeners = new Set();
        matches = true;
        window.matchMedia = jest.fn().mockImplementation((query: string) => ({
            addEventListener: (type: string, listener: () => void) => listeners.add(listener),
            get matches() {
                return matches;
            },
            media: query,
            removeEventListener: (type: string, listener: () => void) => listeners.delete(listener),
        }));
    });

    afterEach(() => {
        window.matchMedia = originalMatchMedia;
    });

    test('should return whether the query matches and follow its changes', () => {
        render(<TestComponent />);

        expect(window.matchMedia).toHaveBeenCalledWith('(min-width: 768px)');
        expect(screen.getByTestId('test-div')).toHaveTextContent('match');

        act(() => {
            matches = false;
            listeners.forEach(listener => listener());
        });

        expect(screen.getByTestId('test-div')).toHaveTextContent('no match');
    });

    test('should stop listening once unmounted', () => {
        const { unmount } = render(<TestComponent />);

        expect(listeners.size).toBe(1);

        unmount();

        expect(listeners.size).toBe(0);
    });

    test('should not match if the browser does not support media queries', () => {
        // @ts-expect-error jsdom has no matchMedia
        delete window.matchMedia;

        render(<TestComponent />);

        expect(screen.getByTestId('test-div')).toHaveTextContent('no match');
    });
});
