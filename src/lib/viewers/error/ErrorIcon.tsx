import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { getIcon } from 'box-ui-elements/es/components/preview';

export type Options = {
    containerEl: HTMLElement;
};

export default class ErrorIcon {
    root: Root;

    constructor({ containerEl }: Options) {
        this.root = createRoot(containerEl);
    }

    destroy(): void {
        this.root.unmount();
    }

    render(extension?: string): void {
        const Icon = getIcon(extension);

        this.root.render(<Icon extension={extension} />);
    }
}
