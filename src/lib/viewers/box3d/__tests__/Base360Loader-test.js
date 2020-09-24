/* eslint-disable no-unused-expressions */
import Base360Loader from '../Base360Loader';
import * as util from '../../../util';

let file;
let base360Loader;
const sandbox = sinon.createSandbox();

describe('lib/viewers/box3d/Base360Loader', () => {
    beforeEach(() => {
        base360Loader = new Base360Loader();
        base360Loader.viewers = [
            {
                REP: 'dash',
                EXT: 'mp4',
            },
        ];

        file = {
            extension: 'mp4',
            representations: {
                entries: [
                    {
                        representation: 'dash',
                    },
                ],
            },
        };
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    describe('determineViewer()', () => {
        test('should return viewer if file requires 360 viewer', () => {
            jest.spyOn(util, 'requires360Viewer').mockReturnValue(true);
            expect(base360Loader.determineViewer(file)).toBe(base360Loader.viewers[0]);
        });

        test('should return undefined if file does not need 360 viewer', () => {
            jest.spyOn(util, 'requires360Viewer').mockReturnValue(false);
            expect(base360Loader.determineViewer(file)).toBeUndefined();
        });
    });
});
