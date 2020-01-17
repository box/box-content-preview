Object.defineProperty(global.navigator, 'mimeTypes', {
    configurable: true,
    value: [],
    writable: true,
});

Object.defineProperty(document, 'createRange', {
    value: () => ({
        commonAncestorContainer: {
            nodeName: 'BODY',
            ownerDocument: document,
        },
        createContextualFragment: fragment => {
            const el = document.createElement('div');
            el.innerHTML = fragment;
            return el.children[0];
        },
        selectNode: () => {},
        setStart: () => {},
        setEnd: () => {},
    }),
});

Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
    get() {
        return this.parentNode;
    },
});

Object.defineProperty(HTMLMediaElement.prototype, 'load', { value: jest.fn() });
Object.defineProperty(HTMLMediaElement.prototype, 'play', { value: jest.fn() });
