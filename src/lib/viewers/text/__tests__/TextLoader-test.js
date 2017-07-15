/* eslint-disable no-unused-expressions */
import TextLoader from '../TextLoader';
import * as util from '../../../util';

let file;
const sandbox = sinon.sandbox.create();

describe('lib/viewers/text/TextLoader', () => {
    beforeEach(() => {
        TextLoader.viewers = [
            {
                REP: 'ORIGINAL',
                EXT: 'html'
            }
        ];

        file = {
            extension: 'html',
            representations: {
                entries: [
                    {
                        representation: 'ORIGINAL'
                    }
                ]
            }
        };
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    describe('determineViewer()', () => {
        it('should return viewer if file is not a Vera-protected file', () => {
            sandbox.stub(util, 'isVeraProtectedFile').returns(false);
            expect(TextLoader.determineViewer(file)).to.equal(TextLoader.viewers[0]);
        });

        it('should return undefined if file is a Vera-protected file', () => {
            sandbox.stub(util, 'isVeraProtectedFile').returns(true);
            expect(TextLoader.determineViewer(file)).to.equal(undefined);
        });
    });
});
