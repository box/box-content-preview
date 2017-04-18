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

    describe('prefetch()', () => {
        beforeEach(() => {
            mp4.options.representation = {
                content: {
                    url_template: 'sometemplate'
                }
            };
        });

        it('should prefetch content if content is true and representation is ready', () => {
            sandbox.stub(mp4, 'isRepresentationReady').returns(true);
            sandbox.stub(mp4, 'createContentUrlWithAuthParams').returns('someContentUrl');
            mp4.prefetch({ content: true });
            expect(mp4.createContentUrlWithAuthParams).to.be.calledWith('sometemplate');
        });

        it('should not prefetch content if content is true but representation is not ready', () => {
            sandbox.stub(mp4, 'isRepresentationReady').returns(false);
            sandbox.stub(mp4, 'createContentUrlWithAuthParams');
            mp4.prefetch({ content: true });
            expect(mp4.createContentUrlWithAuthParams).to.not.be.called;
        });
    });
});
