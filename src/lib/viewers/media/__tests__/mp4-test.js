/* eslint-disable no-unused-expressions */
import MP4 from '../mp4';

const sandbox = sinon.sandbox.create();
let mp4;

describe('lib/media/mp4', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/media/__tests__/mp4-test.html');
        const containerEl = document.querySelector('.container');
        mp4 = new MP4({
            container: containerEl,
            file: {
                id: 1
            }
        });
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();
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
        it('should prefetch content with auth params', () => {
            const template = 'someTemplate';
            mp4.options.representation = {
                data: { content: { url_template: template } }
            };
            sandbox.stub(mp4, 'createContentUrlWithAuthParams');

            mp4.prefetch();
            expect(mp4.createContentUrlWithAuthParams).to.be.calledWith(template);
        });
    });
});
