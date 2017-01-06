/* eslint-disable no-unused-expressions */
import Video360Loader from '../video360-loader';
import Browser from '../../../../browser';

const sandbox = sinon.sandbox.create();

describe('video360-loader', () => {
    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    describe('Video360Loader()', () => {
        it('should set viewers property with required representations', () => {
            expect(Video360Loader.viewers[0].REQUIRED_REPRESENTATIONS !== undefined);
        });
    });

    describe('determineViewer()', () => {
        it('should throw an error if browser is not supported', () => {
            const file = {
                extension: 'mp4',
                name: 'blah.360.mp4',
                representations: {
                    entries: [{
                        representation: 'dash'
                    }]
                }
            };

            sandbox.stub(Browser, 'hasWebGL').returns(true);
            sandbox.stub(Browser, 'getName').returns('Safari'); // Safari is not supported
            expect(() => Video360Loader.determineViewer(file)).to.throw(Error, /support preview for this file type/);
        });

        it('should throw an error if on iOS', () => {
            const file = {
                extension: 'mp4',
                name: 'blah.360.mp4',
                representations: {
                    entries: [{
                        representation: 'dash'
                    }]
                }
            };

            sandbox.stub(Browser, 'hasWebGL').returns(true);
            sandbox.stub(Browser, 'getName').returns('Chrome');
            sandbox.stub(Browser, 'isIOS').returns(true);
            expect(() => Video360Loader.determineViewer(file)).to.throw(Error, /support preview for this file type/);
        });

        it('should return viewer if 360 is properly supported', () => {
            const file = {
                extension: 'mp4',
                name: 'blah.360.mp4',
                representations: {
                    entries: [{
                        representation: 'dash'
                    }]
                }
            };

            sandbox.stub(Browser, 'hasWebGL').returns(true);
            sandbox.stub(Browser, 'getName').returns('Chrome');
            sandbox.stub(Browser, 'isIOS').returns(false);

            expect(Video360Loader.determineViewer(file)).to.equal(Video360Loader.viewers[0]);
        });
    });
});
