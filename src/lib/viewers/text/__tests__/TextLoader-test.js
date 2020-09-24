/* eslint-disable no-unused-expressions */
import TextLoader from '../TextLoader';
import * as file from '../../../file';

let stubFile;
const sandbox = sinon.createSandbox();

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
        test('should return viewer if file is not a Vera-protected file', () => {
            jest.spyOn(file, 'isVeraProtectedFile').mockReturnValue(false);
            expect(TextLoader.determineViewer(stubFile)).toBe(TextLoader.viewers[0]);
        });

        test('should return undefined if file is a Vera-protected file', () => {
            jest.spyOn(file, 'isVeraProtectedFile').mockReturnValue(true);
            expect(TextLoader.determineViewer(stubFile)).toBeUndefined();
        });
    });
});
