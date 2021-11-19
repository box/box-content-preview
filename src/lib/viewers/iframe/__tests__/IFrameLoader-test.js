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

    test('should have the correct viewer', () => {
        const iframeViewer = IFrameLoader.viewers[0];
        expect(iframeViewer).toEqual({
            NAME: 'IFrame',
            CONSTRUCTOR: IFrameViewer,
            REP: 'ORIGINAL',
            EXT: ['boxnote', 'boxdicom'],
        });
    });

    test.each`
        disableDicom | fileType      | viewerInstance             | viewerExtensions
        ${false}     | ${'boxdicom'} | ${IFrameLoader.viewers[0]} | ${['boxnote', 'boxdicom']}
        ${true}      | ${'boxdicom'} | ${undefined}               | ${['boxnote']}
        ${true}      | ${'boxnote'}  | ${IFrameLoader.viewers[0]} | ${['boxnote']}
    `(
        'should return correct result depending on the disableDicom viewer option and file type',
        ({ disableDicom, fileType, viewerInstance, viewerExtensions }) => {
            iframe.options.file.extension = fileType;

            const viewerOptions = {
                IFrame: {
                    disableDicom,
                },
            };
            const viewer = IFrameLoader.determineViewer(iframe.options.file, [], viewerOptions);
            expect(viewer).toEqual(viewerInstance);
            expect(IFrameLoader.getViewers()[0].EXT).toMatchObject(viewerExtensions);
        },
    );
});
