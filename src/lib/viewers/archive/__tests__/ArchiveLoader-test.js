/* eslint-disable no-unused-expressions */
import ArchiveLoader from '../ArchiveLoader';

let stubFile;
const sandbox = sinon.sandbox.create();

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
        it('should return archive viewer', () => {
            expect(ArchiveLoader.determineViewer(stubFile)).to.equal(ArchiveLoader.viewers[0]);
        });
    });
});
