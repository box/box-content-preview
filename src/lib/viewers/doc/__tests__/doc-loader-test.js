/* eslint-disable no-unused-expressions */
import DocLoader from '../doc-loader';
import Doc from '../document';

const sandbox = sinon.sandbox.create();

describe('doc-loader', () => {
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
                    entries: [{
                        representation: 'pdf',
                        status: {
                            state: 'success'
                        }
                    }, {
                        representation: 'ORIGINAL',
                        status: {
                            state: 'success'
                        }
                    }]
                }
            };

            viewer = {
                NAME: 'Document',
                CONSTRUCTOR: Doc,
                REP: 'pdf',
                EXT: ['docx']
            };
        });

        it('should return pdf rep if file is not a pdf', () => {
            const determinedRep = DocLoader.determineRepresentation(file, viewer);
            expect(determinedRep.representation).to.equal('pdf');
        });

        it('should return pdf rep if rep is not pending', () => {
            file.extension = 'pdf';
            viewer.EXT = ['pdf'];

            const determinedRep = DocLoader.determineRepresentation(file, viewer);
            expect(determinedRep.representation).to.equal('pdf');
        });

        it('should return original rep if pdf rep is pending', () => {
            file.extension = 'pdf';
            file.representations.entries[0].status.state = 'pending';
            viewer.EXT = ['pdf'];

            const determinedRep = DocLoader.determineRepresentation(file, viewer);
            expect(determinedRep.representation).to.equal('ORIGINAL');
        });
    });
});
