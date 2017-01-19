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

            const viewer = {
                REP: 'pdf',
                EXT: ['docx'],
                JS: [],
                CSS: [],
                NAME: 'Document',
                PREFETCH: 'xhr'
            };

            const determinedRep = DocLoader.determineRepresentation(file, viewer);
            expect(determinedRep).to.deep.equal({
                representation: 'pdf',
                status: {
                    state: 'success'
                }
            });
        });

        it('should return pdf rep if rep is not pending', () => {
            const file = {
                extension: 'pdf',
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

            const viewer = {
                REP: 'pdf',
                EXT: ['pdf'],
                JS: [],
                CSS: [],
                NAME: 'Document',
                PREFETCH: 'xhr'
            };

            const determinedRep = DocLoader.determineRepresentation(file, viewer);
            expect(determinedRep).to.deep.equal({
                representation: 'pdf',
                status: {
                    state: 'success'
                }
            });
        });

        it('should return original rep if pdf rep is pending', () => {
            const file = {
                extension: 'pdf',
                representations: {
                    entries: [{
                        representation: 'pdf',
                        status: {
                            state: 'pending'
                        }
                    }, {
                        representation: 'ORIGINAL',
                        status: {
                            state: 'success'
                        }
                    }]
                }
            };

            const viewer = {
                REP: 'pdf',
                EXT: ['pdf'],
                JS: [],
                CSS: [],
                NAME: 'Document',
                PREFETCH: 'xhr'
            };

            const determinedRep = DocLoader.determineRepresentation(file, viewer);
            expect(determinedRep).to.deep.equal({
                representation: 'ORIGINAL',
                status: {
                    state: 'success'
                }
            });
        });
    });
});
