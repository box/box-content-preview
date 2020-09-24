/* eslint-disable no-unused-expressions */
import SWFLoader from '../SWFLoader';
import AssetLoader from '../../AssetLoader';
import Browser from '../../../Browser';
import PreviewError from '../../../PreviewError';

const sandbox = sinon.createSandbox();
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

        test('should throw a preview error if flash is not supported', () => {
            jest.spyOn(Browser, 'hasFlash').mockReturnValue(false);
            expect(() => SWFLoader.determineViewer(file)).toThrowError(PreviewError);
        });

        test('should call the superclass determineViewer if flash is suported', () => {
            jest.spyOn(Browser, 'hasFlash').mockReturnValue(true);
            const stub = jest.spyOn(AssetLoader.prototype, 'determineViewer');
            SWFLoader.determineViewer(file);
            expect(stub).toBeCalled();
        });

        test('should not check Flash if file is not SWF', () => {
            jest.spyOn(Browser, 'hasFlash');
            file.extension = 'jpg';
            expect(Browser.hasFlash).not.toBeCalled();
        });
    });
});
