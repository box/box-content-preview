/* eslint-disable no-unused-expressions */
import SWFLoader from '../SWFLoader';
import AssetLoader from '../../AssetLoader';
import Browser from '../../../Browser';
import PreviewError from '../../../PreviewError';

const sandbox = sinon.sandbox.create();
let file;

describe('lib/viewers/SWFLoader', () => {
    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    describe('determineViewer()', () => {
        beforeEach(() => {
            file = {
                extension: 'swf',
                representations: {
                    entries: [
                        {
                            representation: 'ORIGINAL',
                        },
                    ],
                },
            };
        });

        it('should throw a preview error if flash is not supported', () => {
            sandbox.stub(Browser, 'hasFlash').returns(false);
            expect(() => SWFLoader.determineViewer(file)).to.throw(PreviewError);
        });

        it('should call the superclass determineViewer if flash is suported', () => {
            sandbox.stub(Browser, 'hasFlash').returns(true);
            const stub = sandbox.stub(AssetLoader.prototype, 'determineViewer');
            SWFLoader.determineViewer(file);
            expect(stub).to.be.called;
        });

        it('should not check Flash if file is not SWF', () => {
            sandbox.stub(Browser, 'hasFlash');
            file.extension = 'jpg';
            expect(Browser.hasFlash).to.not.be.called;
        });
    });
});
