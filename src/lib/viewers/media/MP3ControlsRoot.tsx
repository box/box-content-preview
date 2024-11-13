import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import './MP3ControlsRoot.scss';

export type Options = {
    containerEl: HTMLElement;
};

export default class MP3ControlsRoot {
    containerEl: HTMLElement;

    controlsEl: HTMLElement;

    root: Root;

    constructor({ containerEl }: Options) {
        this.controlsEl = document.createElement('div');
        this.controlsEl.setAttribute('class', 'bp-MP3ControlsRoot');
        this.controlsEl.setAttribute('data-testid', 'bp-controls');

        this.containerEl = containerEl;
        this.containerEl.appendChild(this.controlsEl);

        this.root = createRoot(this.controlsEl);
    }

    destroy(): void {
        this.root.unmount();

        if (this.containerEl) {
            this.containerEl.removeChild(this.controlsEl);
        }
    }

    render(controls: React.JSX.Element): void {
        this.root.render(controls);
    }
}
