// For a Radix layer's onEscapeKeyDown. Radix closes the layer from a document listener, and the host's
// Escape hotkey (e.g. preview-client's HotkeyLayer on window) would otherwise close the whole preview too.
export default function stopEscapePropagation(event: KeyboardEvent): void {
    event.stopPropagation();
}
