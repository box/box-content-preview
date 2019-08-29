/* eslint-disable no-unused-expressions */
import TextLoader from '../TextLoader';
import * as file from '../../../file';

let stubFile;
const sandbox = sinon.sandbox.create();

describe('lib/viewers/text/TextLoader', () => {
    beforeEach(() => {
        TextLoader.viewers = [
            {
                REP: 'ORIGINAL',
                EXT: 'html',
            },
        ];

        stubFile = {
            extension: 'html',
            representations: {
                entries: [
                    {
                        representation: 'ORIGINAL',
                    },
                ],
            },
        };
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    describe('determineViewer()', () => {
        it('should return viewer if file is not a Vera-protected file', () => {
            sandbox.stub(file, 'isVeraProtectedFile').returns(false);
            expect(TextLoader.determineViewer(stubFile)).to.equal(TextLoader.viewers[0]);
        });

        it('should return undefined if file is a Vera-protected file', () => {
            sandbox.stub(file, 'isVeraProtectedFile').returns(true);
            expect(TextLoader.determineViewer(stubFile)).to.equal(undefined);
        });
    });
});
