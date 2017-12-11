/* eslint-disable no-unused-expressions */
import MP4Viewer from '../MP4Viewer';
import BaseViewer from '../../BaseViewer';

const sandbox = sinon.sandbox.create();
let mp4;

describe('lib/viewers/media/MP4Viewer', () => {
    const setupFunc = BaseViewer.prototype.setup;

    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/media/__tests__/MP4Viewer-test.html');
        const containerEl = document.querySelector('.container');
        mp4 = new MP4Viewer({
            container: containerEl,
            file: {
                id: 1
            }
        });

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: sandbox.stub() });
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
        it('should have proper class added to wrapper', () => {
            mp4.setup();
            expect(mp4.wrapperEl).to.have.class('bp-media-mp4');
        });
    });
});
