/* eslint-disable no-unused-expressions */
/* global swfobject */
import SWFLoader from '../SWFLoader';
import AssetLoader from '../../AssetLoader';
import Browser from '../../../Browser';
import PreviewError from '../../../PreviewError';

const sandbox = sinon.sandbox.create();

describe('lib/viewers/SWFLoader', () => {
    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    describe('determineViewer()', () => {
        it('should throw a preview error if flash is not supported', () => {
            sandbox.stub(Browser, 'hasFlash').returns(false);
            expect(() => SWFLoader.determineViewer()).to.throw(PreviewError);
        });

        it('should call the superclass determineViewer if flash is suported', () => {
            sandbox.stub(Browser, 'hasFlash').returns(true);
            const stub = sandbox.stub(AssetLoader.prototype, 'determineViewer');
            SWFLoader.determineViewer();
            expect(stub).to.have.been.called;
        });
    });
});
