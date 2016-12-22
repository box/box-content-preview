/* eslint-disable no-unused-expressions */
import Video360Loader from '../video360-loader';
import Browser from '../../../../browser';

const sandbox = sinon.sandbox.create();

describe('video360-loader', () => {
    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    describe('determineViewer()', () => {
        it('should throw an error if browser is not supported', () => {
            const file = {
                extension: 'mp4',
                representations: {
                    entries: [{
                        representation: 'dash'
                    }]
                }
            };

            sandbox.stub(Browser, 'getName').returns('Safari'); // Safari is not supported
            expect(() => Video360Loader.determineViewer(file)).to.throw(Error);
        });

        it('should throw an error if on iOS', () => {
            const file = {
                extension: 'mp4',
                representations: {
                    entries: [{
                        representation: 'dash'
                    }]
                }
            };

            sandbox.stub(Browser, 'isIOS').returns(true);
            expect(() => Video360Loader.determineViewer(file)).to.throw(Error);
        });
    });
});
