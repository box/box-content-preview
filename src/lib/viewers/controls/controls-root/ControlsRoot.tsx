import React from 'react';
import ReactDOM from 'react-dom';
import noop from 'lodash/noop';
import throttle from 'lodash/throttle';
import ControlsLayer, { Helpers } from '../controls-layer';
import './ControlsRoot.scss';

export type Options = {
    containerEl: HTMLElement;
};

export default class ControlsRoot {
    containerEl: HTMLElement;

    controlsEl: HTMLElement;

    controlsLayer: Helpers = {
        hide: noop,
        reset: noop,
        show: noop,
    };

    constructor({ containerEl }: Options) {
        this.controlsEl = document.createElement('div');
        this.controlsEl.setAttribute('class', 'bp-ControlsRoot');
        this.controlsEl.setAttribute('data-testid', 'bp-controls');
        this.controlsEl.setAttribute('data-resin-component', 'toolbar');

        this.containerEl = containerEl;
        this.containerEl.addEventListener('mousemove', this.handleMouseMove);
        this.containerEl.addEventListener('touchstart', this.handleTouchStart);
        this.containerEl.appendChild(this.controlsEl);
    }

    handleMount = (helpers: Helpers): void => {
        this.controlsLayer = helpers;
    };

    handleMouseMove = throttle((): void => {
        this.controlsLayer.show();
        this.controlsLayer.hide(); // Hide after delay unless movement is continuous
    }, 100);

    handleTouchStart = throttle((): void => {
        this.controlsLayer.reset(); // Ignore focus/hover state for touch events
        this.controlsLayer.show();
        this.controlsLayer.hide(); // Hide after delay unless movement is continuous
    }, 100);

    destroy(): void {
        ReactDOM.unmountComponentAtNode(this.controlsEl);

        if (this.containerEl) {
            this.containerEl.removeEventListener('mousemove', this.handleMouseMove);
            this.containerEl.removeEventListener('touchstart', this.handleMouseMove);
            this.containerEl.removeChild(this.controlsEl);
        }
    }

    disable(): void {
        this.controlsEl.classList.add('bp-is-hidden');
    }

    enable(): void {
        this.controlsEl.classList.remove('bp-is-hidden');
    }

    render(controls: JSX.Element): void {
        ReactDOM.render(<ControlsLayer onMount={this.handleMount}>{controls}</ControlsLayer>, this.controlsEl);
    }
}
