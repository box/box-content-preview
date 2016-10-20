/* eslint-disable no-unused-expressions */
import TextLoader from '../text-loader';

const sandbox = sinon.sandbox.create();

describe('text-loader', () => {
    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    describe('determineViewer()', () => {
        it('should not return viewer if file size is greater than 250KB', () => {
            const file = {
                size: 250001,
                extension: 'txt',
                representations: {
                    entries: [{
                        representation: 'original'
                    }]
                }
            };

            const viewer = TextLoader.determineViewer(file);
            expect(viewer).to.be.null;
        });
    });
});
