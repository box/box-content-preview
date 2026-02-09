/* eslint-disable no-unused-expressions */
import MediaLoader from '../MediaLoader';
import Browser from '../../../Browser';
import PreviewError from '../../../PreviewError';
import * as util from '../../../util';
import { PRELOAD_REP_NAME } from '../../../constants';

const sandbox = sinon.createSandbox();

const dashViewer = MediaLoader.viewers.find(v => v.NAME === 'Dash');
const mp4Viewer = MediaLoader.viewers.find(v => v.NAME === 'MP4');

describe('lib/viewers/media/MediaLoader', () => {
    afterEach(() => {
        sandbox.verifyAndRestore();
        jest.restoreAllMocks();
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

        test('should return Dash viewer when file has only preload rep and browser can play Dash', () => {
            const file = {
                extension: 'mp4',
                representations: {
                    entries: [{ representation: PRELOAD_REP_NAME }],
                },
            };
            jest.spyOn(util, 'requires360Viewer').mockReturnValue(false);
            jest.spyOn(Browser, 'canPlayDash').mockReturnValue(true);
            expect(MediaLoader.determineViewer(file)).toBe(dashViewer);
        });

        test('should return MP4 viewer when file has only preload rep and browser cannot play Dash', () => {
            const file = {
                extension: 'mp4',
                representations: {
                    entries: [{ representation: PRELOAD_REP_NAME }],
                },
            };
            jest.spyOn(util, 'requires360Viewer').mockReturnValue(false);
            jest.spyOn(Browser, 'canPlayDash').mockReturnValue(false);
            expect(MediaLoader.determineViewer(file)).toBe(mp4Viewer);
        });

        test('should return MP4 viewer when file has only preload rep and Dash is disabled', () => {
            const file = {
                extension: 'mp4',
                representations: {
                    entries: [{ representation: PRELOAD_REP_NAME }],
                },
            };
            jest.spyOn(util, 'requires360Viewer').mockReturnValue(false);
            jest.spyOn(Browser, 'canPlayDash').mockReturnValue(true);
            expect(MediaLoader.determineViewer(file, ['Dash'])).toBe(mp4Viewer);
        });

        test('should return undefined when file has preload rep but extension is not video', () => {
            const file = {
                extension: 'txt',
                representations: {
                    entries: [{ representation: PRELOAD_REP_NAME }],
                },
            };
            jest.spyOn(util, 'requires360Viewer').mockReturnValue(false);
            expect(MediaLoader.determineViewer(file)).toBeUndefined();
        });
    });

    describe('determineRepresentation()', () => {
        test('should return dash rep when Dash viewer and file has dash rep', () => {
            const dashRep = { representation: 'dash' };
            const file = {
                representations: { entries: [dashRep, { representation: PRELOAD_REP_NAME }] },
            };
            expect(MediaLoader.determineRepresentation(file, dashViewer)).toBe(dashRep);
        });

        test('should return mp4 rep when MP4 viewer and file has mp4 rep', () => {
            const mp4Rep = { representation: 'mp4' };
            const file = {
                representations: { entries: [mp4Rep, { representation: PRELOAD_REP_NAME }] },
            };
            expect(MediaLoader.determineRepresentation(file, mp4Viewer)).toBe(mp4Rep);
        });

        test('should return preload rep when Dash viewer and file has only preload rep', () => {
            const preloadRep = { representation: PRELOAD_REP_NAME };
            const file = {
                representations: { entries: [preloadRep] },
            };
            expect(MediaLoader.determineRepresentation(file, dashViewer)).toBe(preloadRep);
        });

        test('should return preload rep when MP4 viewer and file has only preload rep', () => {
            const preloadRep = { representation: PRELOAD_REP_NAME };
            const file = {
                representations: { entries: [preloadRep] },
            };
            expect(MediaLoader.determineRepresentation(file, mp4Viewer)).toBe(preloadRep);
        });

        test('should return preload rep when Dash viewer and file has only mp4 rep and preload rep', () => {
            const preloadRep = { representation: PRELOAD_REP_NAME };
            const file = {
                representations: { entries: [{ representation: 'mp4' }, preloadRep] },
            };
            expect(MediaLoader.determineRepresentation(file, dashViewer)).toBe(preloadRep);
        });

        test('should return undefined when Dash viewer and file has only mp4 rep and no preload rep', () => {
            const file = {
                representations: { entries: [{ representation: 'mp4' }] },
            };
            expect(MediaLoader.determineRepresentation(file, dashViewer)).toBeUndefined();
        });
    });
});
