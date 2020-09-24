/* eslint-disable no-unused-expressions */
import Video360Loader from '../Video360Loader';
import Browser from '../../../../Browser';
import PreviewError from '../../../../PreviewError';

describe('lib/viewers/box3d/video360/Video360Loader', () => {
    describe('determineViewer()', () => {
        const file = {
            extension: 'mp4',
            name: 'blah.360.mp4',
            representations: {
                entries: [
                    {
                        representation: 'dash',
                    },
                ],
            },
        };

        test('should throw an error if browser is not supported', () => {
            jest.spyOn(Browser, 'hasWebGL').mockReturnValue(true);
            jest.spyOn(Browser, 'getName').mockReturnValue('IE11');
            expect(() => Video360Loader.determineViewer(file)).toThrowError(PreviewError);
        });

        test('should throw an error if on iOS', () => {
            jest.spyOn(Browser, 'hasWebGL').mockReturnValue(true);
            jest.spyOn(Browser, 'getName').mockReturnValue('Chrome');
            jest.spyOn(Browser, 'isIOS').mockReturnValue(true);
            expect(() => Video360Loader.determineViewer(file)).toThrowError(PreviewError);
        });

        test('should throw an error if browser does not support WebGL', () => {
            jest.spyOn(Browser, 'hasWebGL').mockReturnValue(false);
            jest.spyOn(Browser, 'getName').mockReturnValue('Chrome');
            jest.spyOn(Browser, 'isIOS').mockReturnValue(true);
            expect(() => Video360Loader.determineViewer(file)).toThrowError(PreviewError);
        });

        test('should return viewer if 360 is properly supported', () => {
            jest.spyOn(Browser, 'hasWebGL').mockReturnValue(true);
            jest.spyOn(Browser, 'getName').mockReturnValue('Chrome');
            jest.spyOn(Browser, 'isIOS').mockReturnValue(false);
            expect(Video360Loader.determineViewer(file)).toBe(Video360Loader.viewers[0]);
        });
    });
});
