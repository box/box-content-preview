/* eslint-disable no-unused-expressions */
import Base360Loader from '../base360-loader';
import * as util from '../../../util';

let file;
let base360Loader;
const sandbox = sinon.sandbox.create();

describe('base360-loader', () => {
    beforeEach(() => {
        base360Loader = new Base360Loader();
        const some360Viewer = {
            REP: 'dash',
            EXT: 'mp4'
        };

        base360Loader.viewers = [some360Viewer];

        file = {
            extension: 'mp4',
            representations: {
                entries: [{
                    representation: 'dash'
                }]
            }
        };
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    describe('determineViewer()', () => {
        it('should return viewer if file requires 360 viewer', () => {
            sandbox.stub(util, 'requires360Viewer').returns(true);
            expect(base360Loader.determineViewer(file)).to.equal(base360Loader.viewers[0]);
        });

        it('should return undefined if file does not need 360 viewer', () => {
            sandbox.stub(util, 'requires360Viewer').returns(false);
            expect(base360Loader.determineViewer(file)).to.equal(undefined);
        });
    });
});
