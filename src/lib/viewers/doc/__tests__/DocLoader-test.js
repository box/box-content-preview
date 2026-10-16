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

        test('should return the ocr_pdf rep when it is present and successful', () => {
            file.representations.entries.unshift({
                representation: 'ocr_pdf',
                status: { state: 'success' },
            });
            viewer.REP = 'ocr_pdf';

            const determinedRep = DocLoader.determineRepresentation(file, viewer);
            expect(determinedRep.representation).toBe('ocr_pdf');
        });

        test('should fall back to the pdf rep when a present ocr_pdf rep has failed', () => {
            file.representations.entries.unshift({
                representation: 'ocr_pdf',
                status: { state: 'error' },
            });
            viewer.REP = 'ocr_pdf';

            const determinedRep = DocLoader.determineRepresentation(file, viewer);
            expect(determinedRep.representation).toBe('pdf');
        });

        test.each(['pending', 'none', 'viewable'])(
            'should keep the ocr_pdf rep when its conversion is still in progress (%s)',
            state => {
                file.representations.entries.unshift({
                    representation: 'ocr_pdf',
                    status: { state },
                });
                viewer.REP = 'ocr_pdf';

                const determinedRep = DocLoader.determineRepresentation(file, viewer);
                expect(determinedRep.representation).toBe('ocr_pdf');
            },
        );

        test('should fall back to the original rep when a born-digital pdf only has a failed ocr_pdf rep', () => {
            file.extension = 'pdf';
            file.representations.entries = [
                { representation: 'ocr_pdf', status: { state: 'error' } },
                { representation: 'ORIGINAL', status: { state: 'success' } },
            ];
            viewer.REP = 'ocr_pdf';
            viewer.EXT = ['pdf'];

            const determinedRep = DocLoader.determineRepresentation(file, viewer);
            expect(determinedRep.representation).toBe('ORIGINAL');
        });

        test('should fall back from a failed ocr_pdf through pdf to the original rep for pdf files', () => {
            file.extension = 'pdf';
            file.representations.entries = [
                { representation: 'ocr_pdf', status: { state: 'error' } },
                { representation: 'pdf', status: { state: 'pending' } },
                { representation: 'ORIGINAL', status: { state: 'success' } },
            ];
            viewer.REP = 'ocr_pdf';
            viewer.EXT = ['pdf'];

            const determinedRep = DocLoader.determineRepresentation(file, viewer);
            expect(determinedRep.representation).toBe('ORIGINAL');
        });
    });

    describe('determineViewer()', () => {
        const getFile = entries => ({
            extension: 'docx',
            representations: { entries },
        });

        test('should prefer the ocr_pdf Document viewer when an ocr_pdf rep is present', () => {
            const file = getFile([
                { representation: 'ocr_pdf', status: { state: 'success' } },
                { representation: 'pdf', status: { state: 'success' } },
                { representation: 'ORIGINAL', status: { state: 'success' } },
            ]);

            const determinedViewer = DocLoader.determineViewer(file);
            expect(determinedViewer.NAME).toBe('Document');
            expect(determinedViewer.REP).toBe('ocr_pdf');
        });

        test('should select the ocr_pdf viewer even when the ocr_pdf rep has failed', () => {
            const file = getFile([
                { representation: 'ocr_pdf', status: { state: 'error' } },
                { representation: 'pdf', status: { state: 'success' } },
                { representation: 'ORIGINAL', status: { state: 'success' } },
            ]);

            const determinedViewer = DocLoader.determineViewer(file);
            expect(determinedViewer.REP).toBe('ocr_pdf');
        });

        test('should fall back to the pdf Document viewer when no ocr_pdf rep exists', () => {
            const file = getFile([
                { representation: 'pdf', status: { state: 'success' } },
                { representation: 'ORIGINAL', status: { state: 'success' } },
            ]);

            const determinedViewer = DocLoader.determineViewer(file);
            expect(determinedViewer.NAME).toBe('Document');
            expect(determinedViewer.REP).toBe('pdf');
        });
    });
});
