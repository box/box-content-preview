/* eslint-disable no-unused-expressions */
import MediaLoader from '../MediaLoader';
import * as util from '../../../util';

const sandbox = sinon.sandbox.create();

describe('lib/viewers/media/MediaLoader', () => {
    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    describe('determineViewer()', () => {
        it('should throw an error if 360 viewer is required', () => {
            const file = {
                extension: 'mp4',
                name: 'blah.mp4',
                representations: {
                    entries: [{
                        representation: 'dash'
                    }]
                }
            };

            sandbox.stub(util, 'requires360Viewer').returns(true);
            expect(() => MediaLoader.determineViewer(file)).to.throw(Error, /browser doesn't support preview for 360-degree videos/);
        });

        it('should return viewer if 360 viewer is not required', () => {
            const file = {
                extension: 'mp4',
                name: 'blah.mp4',
                representations: {
                    entries: [{
                        representation: 'dash'
                    }]
                }
            };

            sandbox.stub(util, 'requires360Viewer').returns(false);
            expect(MediaLoader.determineViewer(file)).to.equal(MediaLoader.viewers[1]);
        });
    });
});
