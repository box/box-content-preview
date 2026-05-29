import * as React from 'react';

export type KeyboardShortcutMap = Record<string, (event: KeyboardEvent) => void>;

const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function isTypingContext(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    if (TYPING_TAGS.has(target.tagName)) return true;
    return target.isContentEditable;
}

function normalizeKey(event: KeyboardEvent): string {
    const parts: string[] = [];
    if (event.metaKey) parts.push('cmd');
    if (event.ctrlKey) parts.push('ctrl');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');
    parts.push(event.key.toLowerCase());
    return parts.join('+');
}

export interface UseKeyboardShortcutsOptions {
    enabled?: boolean;
    target?: React.RefObject<HTMLElement> | null;
}

export default function useKeyboardShortcuts(
    shortcuts: KeyboardShortcutMap,
    { enabled = true, target = null }: UseKeyboardShortcutsOptions = {},
): void {
    const shortcutsRef = React.useRef(shortcuts);
    React.useEffect(() => {
        shortcutsRef.current = shortcuts;
    }, [shortcuts]);

    React.useEffect(() => {
        if (!enabled) return undefined;

        const node: EventTarget = target?.current ?? window;

        const handler = (event: Event): void => {
            const keyboardEvent = event as KeyboardEvent;
            if (isTypingContext(keyboardEvent.target)) return;
            const combo = normalizeKey(keyboardEvent);
            const action = shortcutsRef.current[combo] ?? shortcutsRef.current[keyboardEvent.key.toLowerCase()];
            if (action) {
                action(keyboardEvent);
            }
        };

        node.addEventListener('keydown', handler);
        return () => node.removeEventListener('keydown', handler);
    }, [enabled, target]);
}
