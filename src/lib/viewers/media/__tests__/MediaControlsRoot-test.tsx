import React from 'react';
import ReactDOMServer from 'react-dom/server';
import MediaControlsRoot from '../MediaControlsRoot';

describe('MediaControlsRoot', () => {
    const getInstance = (options = {}): MediaControlsRoot =>
        new MediaControlsRoot({ containerEl: document.createElement('div'), ...options });

    describe('constructor', () => {
        test('should inject a media controls root element into the container', () => {
            const instance = getInstance();

            expect(instance.controlsEl).toHaveClass('bp-MediaControlsRoot');
            expect(instance.controlsEl).toHaveAttribute('data-testid', 'bp-controls');
        });
    });

    describe('destroy', () => {
        test('should remove the media controls root node', () => {
            const instance = getInstance();

            instance.destroy();

            expect(instance.containerEl.firstChild).toBeNull();
        });
    });

    describe('render', () => {
        test('should create a controls layer and pass it the provided components', () => {
            const controls = <div className="TestControls">Controls</div>;
            const instance = getInstance();

            instance.render(controls);

            expect(instance.controlsEl).toContainHTML(ReactDOMServer.renderToStaticMarkup(controls));
        });
    });
});
