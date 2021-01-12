import ReactDOM from 'react-dom';
import './MediaControlsRoot.scss';

export type Options = {
    containerEl: HTMLElement;
};

export default class MediaControlsRoot {
    containerEl: HTMLElement;

    controlsEl: HTMLElement;

    constructor({ containerEl }: Options) {
        this.controlsEl = document.createElement('div');
        this.controlsEl.setAttribute('class', 'bp-MediaControlsRoot');
        this.controlsEl.setAttribute('data-testid', 'bp-controls');

        this.containerEl = containerEl;
        this.containerEl.appendChild(this.controlsEl);
    }

    destroy(): void {
        ReactDOM.unmountComponentAtNode(this.controlsEl);

        if (this.containerEl) {
            this.containerEl.removeChild(this.controlsEl);
        }
    }

    render(controls: JSX.Element): void {
        ReactDOM.render(controls, this.controlsEl);
    }
}
