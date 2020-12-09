/* eslint-disable no-unused-expressions */
import MP3Viewer from '../MP3Viewer';
import MediaBaseViewer from '../MediaBaseViewer';
import BaseViewer from '../../BaseViewer';

jest.mock('../../../AnnotationModule');

let mp3;

describe('lib/viewers/media/MP3Viewer', () => {
    const setupFunc = BaseViewer.prototype.setup;

    beforeEach(() => {
        fixture.load('viewers/media/__tests__/MP3Viewer-test.html');
        const containerEl = document.querySelector('.container');
        mp3 = new MP3Viewer({
            container: containerEl,
            file: {
                id: 1,
            },
        });

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: jest.fn() });
        mp3.containerEl = containerEl;
    });

    afterEach(() => {
        fixture.cleanup();

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: setupFunc });

        if (mp3 && typeof mp3.destroy === 'function') {
            mp3.destroy();
        }

        mp3 = null;
    });

    describe('setup()', () => {
        test('should create mp3 viewer and initialize audio element', () => {
            mp3.setup();

            expect(mp3.wrapperEl).toHaveClass('bp-media-mp3');
            expect(mp3.mediaEl).toBeInstanceOf(HTMLElement);
            expect(mp3.mediaEl).toHaveAttribute('preload', 'auto');
        });
    });

    describe('loadUI()', () => {
        const loadUIFunc = MediaBaseViewer.prototype.loadUI;

        afterEach(() => {
            Object.defineProperty(MediaBaseViewer.prototype, 'loadUI', { value: loadUIFunc });
        });

        test('should load UI and controls', () => {
            Object.defineProperty(MediaBaseViewer.prototype, 'loadUI', { value: jest.fn() });

            mp3.mediaControls = {
                show: jest.fn(),
                destroy: jest.fn(),
                resizeTimeScrubber: jest.fn(),
                removeAllListeners: jest.fn(),
            };

            mp3.loadUI();

            expect(mp3.mediaControls.resizeTimeScrubber).toBeCalled();
            expect(mp3.mediaControls.show).toBeCalled();
        });
    });

    describe('handleAutoplayFail()', () => {
        test('should call pause', () => {
            jest.spyOn(mp3, 'pause').mockImplementation();
            mp3.handleAutoplayFail();
            expect(mp3.pause).toBeCalled();
        });
    });
});
