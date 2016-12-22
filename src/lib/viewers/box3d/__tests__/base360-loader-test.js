/* eslint-disable no-unused-expressions */
import Base360Loader from '../base360-loader';
import Browser from '../../../browser';
import * as util from '../../../util';

const sandbox = sinon.sandbox.create();

describe('base360-loader', () => {
    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    describe('determineViewer()', () => {
        it('should return viewer if file requires 360 viewer and Browser supports WebGL', () => {
            const base360Loader = new Base360Loader();
            const some360Viewer = {
                REPRESENTATION: 'dash',
                EXTENSIONS: 'mp4'
            };

            base360Loader.viewers = [some360Viewer];

            const file = {
                extension: 'mp4',
                representations: {
                    entries: [{
                        representation: 'dash'
                    }]
                }
            };

            sandbox.stub(util, 'requires360Viewer').returns(true);
            sandbox.stub(Browser, 'hasWebGL').returns(true);
            expect(base360Loader.determineViewer(file)).to.equal(some360Viewer);
        });
    });
});
