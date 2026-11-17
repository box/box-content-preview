import React from 'react';

// For a menu's onKeyDown, so its keys don't reach preview's file navigation on document or the host's hotkeys
// (e.g. preview-client's HotkeyLayer on window). Escape must still reach Radix's document listener to close the menu.
export function stopKeyPropagation(event: React.KeyboardEvent): void {
    if (event.key !== 'Escape') {
        event.stopPropagation();
    }
}

// For a Radix layer's onEscapeKeyDown, which runs on document after the layer has closed, so the host's Escape
// hotkey doesn't close the whole preview too.
export function stopEscapePropagation(event: KeyboardEvent): void {
    event.stopPropagation();
}
