import { act } from '@testing-library/react';

// jsdom has no ResizeObserver. This one records each observer's callback so a test can report a resize.
let callbacks = new Map<Element, () => void>();

class ResizeObserverMock {
    callback: () => void;

    constructor(callback: () => void) {
        this.callback = callback;
    }

    disconnect = jest.fn();

    observe = (element: Element): void => {
        callbacks.set(element, this.callback);
    };

    unobserve = jest.fn();
}

// Installs the mock and forgets the elements observed in earlier tests
export function mockResizeObserver(): void {
    callbacks = new Map();
    global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
}

// Runs the callback of the observer watching the element, as the browser does after the element resizes
export function triggerResize(element: Element): void {
    act(() => callbacks.get(element)?.());
}
