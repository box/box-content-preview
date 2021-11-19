import IFrameLoader from '../IFrameLoader';
import IFrameViewer from '../IFrameViewer';

describe('lib/viewers/iframe/IFrameLoader', () => {
    const iframe = new IFrameViewer({
        file: {
            id: '123',
            extension: 'boxnote',
            representations: {
                entries: [
                    {
                        representation: 'ORIGINAL',
                    },
                ],
            },
        },
    });

    test('should have the correct viewers', () => {
        const iframeViewers = IFrameLoader.viewers;
        expect(iframeViewers).toEqual([
            {
                NAME: 'IFrame',
                CONSTRUCTOR: IFrameViewer,
                REP: 'ORIGINAL',
                EXT: ['boxdicom'],
            },
            {
                NAME: 'IFrame',
                CONSTRUCTOR: IFrameViewer,
                REP: 'ORIGINAL',
                EXT: ['boxnote'],
            },
        ]);
    });

    test.each`
        disableDicom | fileType      | viewerInstance
        ${false}     | ${'boxdicom'} | ${IFrameLoader.viewers.find(v => v.EXT.includes('boxdicom'))}
        ${true}      | ${'boxdicom'} | ${undefined}
        ${true}      | ${'boxnote'}  | ${IFrameLoader.viewers.find(v => v.EXT.includes('boxnote'))}
    `(
        'should return correct result depending on the disableDicom viewer option and file type',
        ({ disableDicom, fileType, viewerInstance }) => {
            iframe.options.file.extension = fileType;

            const viewerOptions = {
                IFrame: {
                    disableDicom,
                },
            };
            const viewer = IFrameLoader.determineViewer(iframe.options.file, [], viewerOptions);
            expect(viewer).toEqual(viewerInstance);
            expect(IFrameLoader.getViewers().some(v => v.EXT.includes('boxdicom'))).toEqual(!disableDicom);
        },
    );
});
