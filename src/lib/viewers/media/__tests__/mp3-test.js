/* eslint-disable no-unused-expressions */
import MP3 from '../mp3';
import MediaBase from '../media-base';

const sandbox = sinon.sandbox.create();
let mp3;

describe('lib/viewers/media/mp3', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/media/__tests__/mp3-test.html');
        const containerEl = document.querySelector('.container');
        mp3 = new MP3({
            container: containerEl,
            file: {
                id: 1
            }
        });
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();
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

    describe('prefetch()', () => {
        beforeEach(() => {
            mp3.options.representation = {
                content: {
                    url_template: 'sometemplate'
                }
            };
        });

        it('should prefetch content if content is true and representation is ready', () => {
            sandbox.stub(mp3, 'isRepresentationReady').returns(true);
            sandbox.stub(mp3, 'createContentUrlWithAuthParams').returns('someContentUrl');
            mp3.prefetch({ content: true });
            expect(mp3.createContentUrlWithAuthParams).to.be.calledWith('sometemplate');
        });

        it('should not prefetch content if content is true but representation is not ready', () => {
            sandbox.stub(mp3, 'isRepresentationReady').returns(false);
            sandbox.stub(mp3, 'createContentUrlWithAuthParams');
            mp3.prefetch({ content: true });
            expect(mp3.createContentUrlWithAuthParams).to.not.be.called;
        });
    });

    describe('loadUI()', () => {
        const loadUIFunc = MediaBase.prototype.loadUI;

        afterEach(() => {
            Object.defineProperty(MediaBase.prototype, 'loadUI', { value: loadUIFunc });
        });

        it('should load UI and controls', () => {
            Object.defineProperty(MediaBase.prototype, 'loadUI', { value: sandbox.mock() });

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
