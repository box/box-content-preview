/* eslint-disable no-unused-expressions */
import MediaLoader from '../MediaLoader';
import PreviewError from '../../../PreviewError';
import * as util from '../../../util';

const sandbox = sinon.createSandbox();

describe('lib/viewers/media/MediaLoader', () => {
    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    describe('determineViewer()', () => {
        test('should throw an error if 360 viewer is required', () => {
            const file = {
                extension: 'mp4',
                name: 'blah.mp4',
                representations: {
                    entries: [
                        {
                            representation: 'dash',
                        },
                    ],
                },
            };

            jest.spyOn(util, 'requires360Viewer').mockReturnValue(true);
            expect(() => MediaLoader.determineViewer(file)).toThrowError(PreviewError);
        });

        test('should return viewer if 360 viewer is not required', () => {
            const file = {
                extension: 'mp4',
                name: 'blah.mp4',
                representations: {
                    entries: [
                        {
                            representation: 'dash',
                        },
                    ],
                },
            };

            jest.spyOn(util, 'requires360Viewer').mockReturnValue(false);
            expect(MediaLoader.determineViewer(file)).toBe(MediaLoader.viewers[1]);
        });
    });
});
