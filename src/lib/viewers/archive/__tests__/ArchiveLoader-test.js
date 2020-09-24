/* eslint-disable no-unused-expressions */
import ArchiveLoader from '../ArchiveLoader';

let stubFile;
const sandbox = sinon.createSandbox();

describe('lib/viewers/archive/ArchiveLoader', () => {
    beforeEach(() => {
        ArchiveLoader.viewers = [
            {
                REP: 'json',
                EXT: 'json',
            },
        ];

        stubFile = {
            extension: 'json',
            representations: {
                entries: [
                    {
                        representation: 'json',
                    },
                ],
            },
        };
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    describe('determineViewer()', () => {
        test('should return archive viewer', () => {
            expect(ArchiveLoader.determineViewer(stubFile)).toBe(ArchiveLoader.viewers[0]);
        });
    });
});
