import React from 'react';
import ReactDOM from 'react-dom';
import { PreviewLoading } from 'box-ui-elements/es/components/preview';

export type Options = {
    containerEl: HTMLElement;
};

export default class LoadingIcon {
    containerEl: HTMLElement;

    constructor({ containerEl }: Options) {
        this.containerEl = containerEl;
    }

    destroy(): void {
        ReactDOM.unmountComponentAtNode(this.containerEl);
    }

    render(extension: string): void {
        ReactDOM.render(<PreviewLoading extension={extension} />, this.containerEl);
    }
}
