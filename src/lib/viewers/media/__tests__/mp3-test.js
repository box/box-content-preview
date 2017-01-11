/* eslint-disable no-unused-expressions */
import MP3 from '../mp3';

let mp3;
const sandbox = sinon.sandbox.create();

describe('mp3', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/media/__tests__/mp3-test.html');
        const options = {
            viewerName: 'MP3',
            file: {
                id: 1
            }
        };
        const containerEl = document.querySelector('.container');
        mp3 = new MP3(containerEl, options);
    });

    afterEach(() => {
        sandbox.verifyAndRestore();

        if (typeof mp3.destroy === 'function') {
            mp3.destroy();
            mp3 = null;
        }
    });

    describe('constructor()', () => {
        it('should create mp3 viewer and initialize audio element', () => {
            const wrapperEl = document.querySelector('.bp-media-mp3');
            const mediaEl = document.querySelector('audio');
            const preloadAttr = mp3.mediaEl.getAttribute('preload');

            expect(wrapperEl).to.not.be.null;
            expect(mediaEl).to.not.be.null;
            expect(preloadAttr).to.equal('auto');
        });
    });

    describe('loadUI()', () => {
        it('should load UI and controls', () => {
            Object.defineProperty(Object.getPrototypeOf(MP3.prototype), 'loadUI', {
                value: sandbox.stub()
            });
            mp3.mediaControls = {
                show: sandbox.stub(),
                resizeTimeScrubber: sandbox.stub(),
                removeAllListeners: sandbox.stub(),
                destroy: sandbox.stub()
            };

            mp3.loadUI();
            expect(mp3.mediaControls.show).to.be.called;
            expect(mp3.mediaControls.resizeTimeScrubber).to.be.called;
        });
    });
});
