import IFrameLoader from '../IFrameLoader';
import IFrameViewer from '../IFrameViewer';

describe('lib/viewers/iframe/IFrameLoader', () => {
    test('should have the correct viewers', () => {
        const iframeViewers = IFrameLoader.viewers;
        expect(iframeViewers).toEqual([
            {
                NAME: 'IFrame',
                CONSTRUCTOR: IFrameViewer,
                REP: 'ORIGINAL',
                EXT: ['boxnote'],
            },
        ]);
    });
});
