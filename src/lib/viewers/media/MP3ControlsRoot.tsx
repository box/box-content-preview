import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import BlueprintProviders from '../../BlueprintProviders';
import './MP3ControlsRoot.scss';

export type Options = {
    containerEl: HTMLElement;
    fileExtension?: string;
    fileId?: number | string;
    isBlueprintEnabled?: boolean;
    resinFeature?: string;
};

export default class MP3ControlsRoot {
    containerEl: HTMLElement;

    controlsEl: HTMLElement;

    isBlueprintEnabled: boolean;

    root: Root;

    constructor({ containerEl, fileExtension, fileId, isBlueprintEnabled = false, resinFeature }: Options) {
        this.controlsEl = document.createElement('div');
        this.controlsEl.setAttribute('class', 'bp-MP3ControlsRoot');
        this.controlsEl.setAttribute('data-testid', 'bp-controls');
        this.controlsEl.setAttribute('data-resin-component', 'toolbar');
        if (resinFeature) {
            this.controlsEl.setAttribute('data-resin-feature', resinFeature);
        }
        this.controlsEl.setAttribute('data-resin-fileid', fileId != null ? String(fileId) : '');
        this.controlsEl.setAttribute('data-resin-fileextension', fileExtension || '');

        this.containerEl = containerEl;
        this.containerEl.appendChild(this.controlsEl);

        this.isBlueprintEnabled = isBlueprintEnabled;
        this.root = createRoot(this.controlsEl);
    }

    destroy(): void {
        this.root.unmount();

        if (this.containerEl) {
            this.containerEl.removeChild(this.controlsEl);
        }
    }

    render(controls: React.JSX.Element): void {
        this.root.render(
            this.isBlueprintEnabled ? (
                <BlueprintProviders container={this.containerEl}>{controls}</BlueprintProviders>
            ) : (
                controls
            ),
        );
    }
}
