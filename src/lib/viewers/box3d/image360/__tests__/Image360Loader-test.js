/* eslint-disable no-unused-expressions */
import Image360Loader from '../Image360Loader';
import Browser from '../../../../Browser';
import PreviewError from '../../../../PreviewError';

describe('lib/viewers/box3d/image360/Image360Loader', () => {
    describe('determineViewer()', () => {
        const file = {
            extension: 'jpg',
            name: 'blah.360.jpg',
            representations: {
                entries: [
                    {
                        representation: '3d',
                    },
                ],
            },
        };

        test('should throw an error if browser does not support WebGL', () => {
            jest.spyOn(Browser, 'hasWebGL').mockReturnValue(false);
            expect(() => Image360Loader.determineViewer(file)).toThrowError(PreviewError);
        });

        test('should return viewer if 360 is properly supported', () => {
            jest.spyOn(Browser, 'hasWebGL').mockReturnValue(true);
            expect(Image360Loader.determineViewer(file)).toBe(Image360Loader.viewers[0]);
        });
    });
});
