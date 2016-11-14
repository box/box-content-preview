/* eslint-disable no-unused-expressions */
import DocLoader from '../doc-loader';

const sandbox = sinon.sandbox.create();

describe('doc-loader', () => {
    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    describe('determineRepresentation()', () => {
        it('should return pdf rep if file is not a pdf', () => {
            const file = {
                extension: 'docx',
                representations: {
                    entries: [{
                        representation: 'pdf'
                    }, {
                        representation: 'original'
                    }]
                }
            };

            const viewer = {
                REPRESENTATION: 'pdf',
                EXTENSIONS: ['docx'],
                SCRIPTS: [],
                STYLESHEETS: [],
                CONSTRUCTOR: 'Document',
                PREFETCH: 'xhr'
            };

            const determinedRep = DocLoader.determineRepresentation(file, viewer);
            expect(determinedRep).to.deep.equal({
                representation: 'pdf'
            });
        });

        it('should return pdf rep if rep is not pending', () => {
            const file = {
                extension: 'pdf',
                representations: {
                    entries: [{
                        representation: 'pdf',
                        status: 'success'
                    }, {
                        representation: 'original'
                    }]
                }
            };

            const viewer = {
                REPRESENTATION: 'pdf',
                EXTENSIONS: ['pdf'],
                SCRIPTS: [],
                STYLESHEETS: [],
                CONSTRUCTOR: 'Document',
                PREFETCH: 'xhr'
            };

            const determinedRep = DocLoader.determineRepresentation(file, viewer);
            expect(determinedRep).to.deep.equal({
                representation: 'pdf',
                status: 'success'
            });
        });

        it('should return original rep if pdf rep is pending', () => {
            const file = {
                extension: 'pdf',
                representations: {
                    entries: [{
                        representation: 'pdf',
                        status: 'pending'
                    }, {
                        representation: 'original'
                    }]
                }
            };

            const viewer = {
                REPRESENTATION: 'pdf',
                EXTENSIONS: ['pdf'],
                SCRIPTS: [],
                STYLESHEETS: [],
                CONSTRUCTOR: 'Document',
                PREFETCH: 'xhr'
            };

            const determinedRep = DocLoader.determineRepresentation(file, viewer);
            expect(determinedRep).to.deep.equal({
                representation: 'original'
            });
        });
    });
});
