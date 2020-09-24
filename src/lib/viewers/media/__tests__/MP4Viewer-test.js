/* eslint-disable no-unused-expressions */
import MP4Viewer from '../MP4Viewer';
import BaseViewer from '../../BaseViewer';

const sandbox = sinon.createSandbox();
let mp4;

describe('lib/viewers/media/MP4Viewer', () => {
    const setupFunc = BaseViewer.prototype.setup;

    beforeEach(() => {
        fixture.load('viewers/media/__tests__/MP4Viewer-test.html');
        const containerEl = document.querySelector('.container');
        mp4 = new MP4Viewer({
            container: containerEl,
            file: {
                id: 1,
            },
        });

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: jest.fn() });
        mp4.containerEl = containerEl;
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: setupFunc });

        if (mp4 && typeof mp4.destroy === 'function') {
            mp4.destroy();
        }

        mp4 = null;
    });

    describe('setup()', () => {
        test('should have proper class added to wrapper', () => {
            mp4.setup();
            expect(mp4.wrapperEl).toHaveClass('bp-media-mp4');
        });
    });
});
