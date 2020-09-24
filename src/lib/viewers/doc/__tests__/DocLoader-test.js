/* eslint-disable no-unused-expressions */
import DocLoader from '../DocLoader';
import DocumentViewer from '../DocumentViewer';

const sandbox = sinon.createSandbox();

describe('lib/viewers/doc/DocLoader', () => {
    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    describe('determineRepresentation()', () => {
        let file;
        let viewer;

        beforeEach(() => {
            file = {
                extension: 'docx',
                representations: {
                    entries: [
                        {
                            representation: 'pdf',
                            status: {
                                state: 'success',
                            },
                        },
                        {
                            representation: 'ORIGINAL',
                            status: {
                                state: 'success',
                            },
                        },
                    ],
                },
            };

            viewer = {
                NAME: 'Document',
                CONSTRUCTOR: DocumentViewer,
                REP: 'pdf',
                EXT: ['docx'],
            };
        });

        test('should return pdf rep if file is not a pdf', () => {
            const determinedRep = DocLoader.determineRepresentation(file, viewer);
            expect(determinedRep.representation).toBe('pdf');
        });

        test('should return pdf rep if rep is not pending', () => {
            file.extension = 'pdf';
            viewer.EXT = ['pdf'];

            const determinedRep = DocLoader.determineRepresentation(file, viewer);
            expect(determinedRep.representation).toBe('pdf');
        });

        test('should return original rep if pdf rep is pending', () => {
            file.extension = 'pdf';
            file.representations.entries[0].status.state = 'pending';
            viewer.EXT = ['pdf'];

            const determinedRep = DocLoader.determineRepresentation(file, viewer);
            expect(determinedRep.representation).toBe('ORIGINAL');
        });
    });
});
