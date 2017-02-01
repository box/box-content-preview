/* eslint-disable no-unused-expressions */
import Image360Loader from '../image360-loader';
import Browser from '../../../../browser';

const sandbox = sinon.sandbox.create();

describe('image360-loader', () => {
    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    describe('determineViewer()', () => {
        const file = {
            extension: 'jpg',
            name: 'blah.360.jpg',
            representations: {
                entries: [{
                    representation: '3d'
                }]
            }
        };

        it('should throw an error if browser does not support WebGL', () => {
            sandbox.stub(Browser, 'hasWebGL').returns(false);
            expect(() => Image360Loader.determineViewer(file)).to.throw(Error, /support preview for 360-degree images/);
        });

        it('should return viewer if 360 is properly supported', () => {
            sandbox.stub(Browser, 'hasWebGL').returns(true);
            expect(Image360Loader.determineViewer(file)).to.equal(Image360Loader.viewers[0]);
        });
    });
});
