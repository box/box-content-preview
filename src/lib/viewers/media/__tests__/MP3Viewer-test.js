/* eslint-disable no-unused-expressions */
import MP3Viewer from '../MP3Viewer';
import MediaBaseViewer from '../MediaBaseViewer';
import BaseViewer from '../../BaseViewer';

const sandbox = sinon.sandbox.create();
let mp3;

describe('lib/viewers/media/MP3Viewer', () => {
    const setupFunc = BaseViewer.prototype.setup;

    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/media/__tests__/MP3Viewer-test.html');
        const containerEl = document.querySelector('.container');
        mp3 = new MP3Viewer({
            container: containerEl,
            file: {
                id: 1
            }
        });

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: sandbox.stub() });
        mp3.containerEl = containerEl;
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: setupFunc });

        if (mp3 && typeof mp3.destroy === 'function') {
            mp3.destroy();
        }

        mp3 = null;
    });

    describe('setup()', () => {
        it('should create mp3 viewer and initialize audio element', () => {
            mp3.setup();

            expect(mp3.wrapperEl).to.have.class('bp-media-mp3');
            expect(mp3.mediaEl).to.be.instanceof(HTMLElement);
            expect(mp3.mediaEl).to.have.attribute('preload', 'auto');
        });
    });

    describe('loadUI()', () => {
        const loadUIFunc = MediaBaseViewer.prototype.loadUI;

        afterEach(() => {
            Object.defineProperty(MediaBaseViewer.prototype, 'loadUI', { value: loadUIFunc });
        });

        it('should load UI and controls', () => {
            Object.defineProperty(MediaBaseViewer.prototype, 'loadUI', { value: sandbox.mock() });

            mp3.mediaControls = {
                show: () => {},
                destroy: () => {},
                resizeTimeScrubber: () => {},
                removeAllListeners: () => {}
            };

            const controlsMock = sandbox.mock(mp3.mediaControls);
            controlsMock.expects('show');
            controlsMock.expects('resizeTimeScrubber');

            mp3.loadUI();
        });
    });
});
