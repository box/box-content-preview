import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { PreviewLoading } from 'box-ui-elements/es/components/preview';

export type Options = {
    containerEl: HTMLElement;
};

export default class LoadingIcon {
    root: Root;

    constructor({ containerEl }: Options) {
        this.root = createRoot(containerEl);
    }

    destroy(): void {
        this.root.unmount();
    }

    render(extension: string): void {
        this.root.render(<PreviewLoading extension={extension} />);
    }
}
