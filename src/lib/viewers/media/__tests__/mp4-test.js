/* eslint-disable no-unused-expressions */
import MP4 from '../mp4';

let mp4;
const sandbox = sinon.sandbox.create();

describe('mp4', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/media/__tests__/mp4-test.html');
        const options = {
            viewerName: 'MP4',
            file: {
                id: 1
            }
        };
        const containerEl = document.querySelector('.container');
        mp4 = new MP4(containerEl, options);
    });

    afterEach(() => {
        sandbox.verifyAndRestore();

        if (typeof mp4.destroy === 'function') {
            mp4.destroy();
            mp4 = null;
        }
    });

    describe('MP4()', () => {
        it('should have proper class added to wrapper', () => {
            expect(mp4.wrapperEl.classList.contains('bp-media-mp4')).to.be.true;
        });
    });
});
