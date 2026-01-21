/* eslint-disable no-unused-expressions */
import MediaLoader from '../MediaLoader';
import PreviewError from '../../../PreviewError';
import { ORIGINAL_REP_NAME } from '../../../constants';
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

        test('should return DashViewer for video file with only ORIGINAL representation', () => {
            const file = {
                extension: 'mp4',
                name: 'test.mp4',
                representations: {
                    entries: [
                        {
                            representation: ORIGINAL_REP_NAME,
                        },
                    ],
                },
            };

            jest.spyOn(util, 'requires360Viewer').mockReturnValue(false);
            const viewer = MediaLoader.determineViewer(file);
            expect(viewer).toBeDefined();
            expect(viewer.NAME).toBe('Dash');
            expect(viewer.REP).toBe(ORIGINAL_REP_NAME);
        });

        test('should return MP4Viewer for video file with only ORIGINAL representation when Dash is disabled', () => {
            const file = {
                extension: 'mp4',
                name: 'test.mp4',
                representations: {
                    entries: [
                        {
                            representation: ORIGINAL_REP_NAME,
                        },
                    ],
                },
            };

            jest.spyOn(util, 'requires360Viewer').mockReturnValue(false);
            const viewer = MediaLoader.determineViewer(file, ['Dash']);
            expect(viewer).toBeDefined();
            expect(viewer.NAME).toBe('MP4');
            expect(viewer.REP).toBe(ORIGINAL_REP_NAME);
        });

        test('should prefer dash representation over ORIGINAL when both exist', () => {
            const file = {
                extension: 'mp4',
                name: 'test.mp4',
                representations: {
                    entries: [
                        {
                            representation: 'dash',
                        },
                        {
                            representation: ORIGINAL_REP_NAME,
                        },
                    ],
                },
            };

            jest.spyOn(util, 'requires360Viewer').mockReturnValue(false);
            const viewer = MediaLoader.determineViewer(file);
            expect(viewer).toBeDefined();
            expect(viewer.NAME).toBe('Dash');
            expect(viewer.REP).toBe('dash');
        });
    });

    describe('canLoad()', () => {
        test('should return true for video file with only ORIGINAL representation', () => {
            const file = {
                extension: 'mp4',
                name: 'test.mp4',
                representations: {
                    entries: [
                        {
                            representation: ORIGINAL_REP_NAME,
                        },
                    ],
                },
            };

            expect(MediaLoader.canLoad(file)).toBe(true);
        });

        test('should return true for video file with dash representation', () => {
            const file = {
                extension: 'mp4',
                name: 'test.mp4',
                representations: {
                    entries: [
                        {
                            representation: 'dash',
                        },
                    ],
                },
            };

            expect(MediaLoader.canLoad(file)).toBe(true);
        });

        test('should return true for video file with mp4 representation', () => {
            const file = {
                extension: 'mov',
                name: 'test.mov',
                representations: {
                    entries: [
                        {
                            representation: 'mp4',
                        },
                    ],
                },
            };

            expect(MediaLoader.canLoad(file)).toBe(true);
        });
    });
});
