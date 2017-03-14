/* eslint-disable no-unused-expressions */
import Video360Loader from '../Video360Loader';
import Browser from '../../../../Browser';

const sandbox = sinon.sandbox.create();

describe('lib/viewers/box3d/video360/Video360Loader', () => {
    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    describe('determineViewer()', () => {
        const file = {
            extension: 'mp4',
            name: 'blah.360.mp4',
            representations: {
                entries: [{
                    representation: 'dash'
                }]
            }
        };

        it('should throw an error if browser is not supported', () => {
            sandbox.stub(Browser, 'hasWebGL').returns(true);
            sandbox.stub(Browser, 'getName').returns('Safari'); // Safari is not supported
            expect(() => Video360Loader.determineViewer(file)).to.throw(Error, /support preview for 360-degree videos/);
        });

        it('should throw an error if on iOS', () => {
            sandbox.stub(Browser, 'hasWebGL').returns(true);
            sandbox.stub(Browser, 'getName').returns('Chrome');
            sandbox.stub(Browser, 'isIOS').returns(true);
            expect(() => Video360Loader.determineViewer(file)).to.throw(Error, /support preview for 360-degree videos/);
        });

        it('should throw an error if browser does not support WebGL', () => {
            sandbox.stub(Browser, 'hasWebGL').returns(false);
            sandbox.stub(Browser, 'getName').returns('Chrome');
            sandbox.stub(Browser, 'isIOS').returns(true);
            expect(() => Video360Loader.determineViewer(file)).to.throw(Error, /support preview for 360-degree videos/);
        });

        it('should return viewer if 360 is properly supported', () => {
            sandbox.stub(Browser, 'hasWebGL').returns(true);
            sandbox.stub(Browser, 'getName').returns('Chrome');
            sandbox.stub(Browser, 'isIOS').returns(false);
            expect(Video360Loader.determineViewer(file)).to.equal(Video360Loader.viewers[0]);
        });
    });
});
