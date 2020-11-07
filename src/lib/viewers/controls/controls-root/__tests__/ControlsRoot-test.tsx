import React from 'react';
import ReactDOMServer from 'react-dom/server';
import ControlsRoot from '../ControlsRoot';

describe('ControlsRoot', () => {
    const getInstance = (options = {}): ControlsRoot =>
        new ControlsRoot({ containerEl: document.createElement('div'), fileId: '1', ...options });

    describe('constructor', () => {
        test('should inject a controls root element into the container', () => {
            const instance = getInstance();

            expect(instance.controlsEl).toHaveClass('bp-ControlsRoot');
            expect(instance.controlsEl).toHaveAttribute('data-resin-component', 'toolbar');
            expect(instance.controlsEl).toHaveAttribute('data-resin-fileid', '1');
        });

        test('should attach event handlers to the container element', () => {
            const containerEl = document.createElement('div');
            const addListener = jest.spyOn(containerEl, 'addEventListener');
            const instance = getInstance({ containerEl });

            expect(addListener).toBeCalledWith('mousemove', instance.handleMouseMove);
            expect(addListener).toBeCalledWith('touchstart', instance.handleTouchStart);
        });
    });

    describe('destroy', () => {
        test('should remove event handlers from the container element', () => {
            const containerEl = document.createElement('div');
            const removeListener = jest.spyOn(containerEl, 'removeEventListener');
            const instance = getInstance({ containerEl });

            instance.destroy();

            expect(removeListener).toBeCalledWith('mousemove', expect.any(Function));
            expect(removeListener).toBeCalledWith('touchstart', expect.any(Function));
        });

        test('should remove the controls root node', () => {
            const instance = getInstance();

            instance.destroy();

            expect(instance.containerEl.firstChild).toBeNull();
        });
    });

    describe('disable', () => {
        test('should hide the root element', () => {
            const instance = getInstance();
            instance.disable();

            expect(instance.controlsEl.classList).toContain('bp-is-hidden');
        });
    });

    describe('enable', () => {
        test('should show the root element', () => {
            const instance = getInstance();
            instance.disable();
            instance.enable();

            expect(instance.controlsEl.classList).not.toContain('bp-is-hidden');
        });
    });

    describe('event handlers', () => {
        describe('handleMouseMove', () => {
            test('should show and then hide the controls layer', () => {
                const instance = getInstance();
                jest.spyOn(instance.controlsLayer, 'hide');
                jest.spyOn(instance.controlsLayer, 'reset');
                jest.spyOn(instance.controlsLayer, 'show');

                instance.handleMouseMove();

                expect(instance.controlsLayer.show).toBeCalled();
                expect(instance.controlsLayer.hide).toBeCalled();
            });
        });

        describe('handleTouchStart', () => {
            test('should show, reset, then hide the controls layer', () => {
                const instance = getInstance();
                jest.spyOn(instance.controlsLayer, 'hide');
                jest.spyOn(instance.controlsLayer, 'reset');
                jest.spyOn(instance.controlsLayer, 'show');

                instance.handleTouchStart();

                expect(instance.controlsLayer.show).toBeCalled();
                expect(instance.controlsLayer.reset).toBeCalled();
                expect(instance.controlsLayer.hide).toBeCalled();
            });
        });
    });

    describe('render', () => {
        test('should create a controls layer and pass it the provided components', () => {
            const controls = <div className="TestControls">Controls</div>;
            const instance = getInstance();

            instance.render(controls);

            expect(instance.controlsEl.firstChild).toHaveClass('bp-ControlsLayer');
            expect(instance.controlsEl.firstChild).toContainHTML(ReactDOMServer.renderToStaticMarkup(controls));
        });
    });
});
