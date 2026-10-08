import React from 'react';
import { createRoot } from 'react-dom/client';
import MP3ControlsRoot from '../MP3ControlsRoot';

jest.mock('react-dom/client', () => ({
    createRoot: jest.fn(),
}));

describe('MP3ControlsRoot', () => {
    beforeEach(() => {
        const mockedCreateRoot = createRoot as jest.Mock;
        mockedCreateRoot.mockReturnValue({
            render: jest.fn(),
            unmount: jest.fn(),
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    const getInstance = (options = {}): MP3ControlsRoot =>
        new MP3ControlsRoot({ containerEl: document.createElement('div'), ...options });

    describe('constructor', () => {
        test('should inject a media controls root element into the container', () => {
            const instance = getInstance();

            expect(instance.controlsEl).toHaveClass('bp-MP3ControlsRoot');
            expect(instance.controlsEl).toHaveAttribute('data-testid', 'bp-controls');
            expect(instance.controlsEl).toHaveAttribute('data-resin-component', 'toolbar');
            expect(instance.controlsEl).not.toHaveAttribute('data-resin-feature');
            expect(instance.controlsEl).toHaveAttribute('data-resin-fileid', '');
            expect(instance.controlsEl).toHaveAttribute('data-resin-fileextension', '');
        });

        test('should set resin file attributes when a file is provided', () => {
            const instance = getInstance({ fileExtension: 'mp3', fileId: 1 });

            expect(instance.controlsEl).toHaveAttribute('data-resin-fileid', '1');
            expect(instance.controlsEl).toHaveAttribute('data-resin-fileextension', 'mp3');
        });

        test('should set the audio player v2 feature only when it is passed in', () => {
            const instance = getInstance({ resinFeature: 'audioPlayerV2' });

            expect(instance.controlsEl).toHaveAttribute('data-resin-feature', 'audioPlayerV2');
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

            expect(instance.root.render).toHaveBeenCalledWith(controls);
        });
    });
});
