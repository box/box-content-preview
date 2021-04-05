import React from 'react';
import ReactDOM from 'react-dom';
import { getIcon } from 'box-ui-elements/es/components/preview';

export type Options = {
    containerEl: HTMLElement;
};

export default class ErrorIcon {
    containerEl: HTMLElement;

    constructor({ containerEl }: Options) {
        this.containerEl = containerEl;
    }

    destroy(): void {
        ReactDOM.unmountComponentAtNode(this.containerEl);
    }

    render(extension?: string): void {
        const Icon = getIcon(extension);

        ReactDOM.render(<Icon extension={extension} />, this.containerEl);
    }
}
