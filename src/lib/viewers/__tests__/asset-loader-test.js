/* eslint-disable no-unused-expressions */
import AssetLoader from '../AssetLoader';

let loader;
const sandbox = sinon.sandbox.create();

describe('asset-loader', () => {
    beforeEach(() => {
        loader = new AssetLoader();
    });

    afterEach(() => {
        sandbox.verifyAndRestore();

        if (typeof loader.destroy === 'function') {
            loader.destroy();
        }

        loader = null;
    });

    describe('canLoad()', () => {
        it('should return true if loader can find a viewer to match the file', () => {
            sandbox.stub(loader, 'determineViewer').returns({});

            expect(loader.canLoad({})).to.be.true;
            expect(loader.determineViewer).to.be.called;
        });

        it('should return false if loader can\'t find a viewer to match the file', () => {
            sandbox.stub(loader, 'determineViewer').returns(null);

            expect(loader.canLoad({})).to.be.false;
            expect(loader.determineViewer).to.be.called;
        });
    });

    describe('getViewers()', () => {
        it('should return the loader\'s viewers', () => {
            loader.viewers = [{}, {}];

            expect(loader.getViewers()).to.deep.equal(loader.viewers);
        });

        it('should return an empty array if the loader doesn\'t have viewers', () => {
            expect(loader.getViewers()).to.deep.equal([]);
        });
    });

    describe('determineViewer()', () => {
        beforeEach(() => {
            loader.viewers = [{
                NAME: 'Adobe',
                REP: 'pdf',
                EXT: ['pdf']
            }, {
                NAME: 'Document',
                REP: 'ORIGINAL',
                EXT: ['pdf']
            }, {
                NAME: 'SomeOtherPDFViewer',
                REP: 'pdf',
                EXT: ['pdf']
            }];
        });

        it('should choose the first viewer that matches by extension and representation', () => {
            const file = {
                extension: 'pdf',
                representations: {
                    entries: [{
                        representation: 'pdf'
                    }]
                }
            };

            const viewer = loader.determineViewer(file);
            expect(viewer.NAME).to.equal('Adobe');
        });

        it('should not choose a disabled viewer and instead choose the next matching viewer', () => {
            const file = {
                extension: 'pdf',
                representations: {
                    entries: [{
                        representation: 'ORIGINAL'
                    }, {
                        representation: 'pdf'
                    }]
                }
            };

            const viewer = loader.determineViewer(file, ['Adobe']);
            expect(viewer.NAME).to.equal('Document');
        });

        it('should not return a viewer if no matching viewer is found', () => {
            const file = {
                extension: 'mp3',
                representations: {
                    entries: [{
                        representation: 'ORIGINAL'
                    }, {
                        representation: 'mp3'
                    }]
                }
            };

            const viewer = loader.determineViewer(file, ['Adobe']);
            expect(viewer).to.be.undefined;
        });
    });

    describe('determineRepresentation()', () => {
        const file = {
            representations: {
                entries: [{
                    representation: 'ORIGINAL'
                }, {
                    representation: 'pdf'
                }]
            }
        };

        it('should return a representation based on the file and viewer', () => {
            const viewer = {
                REP: 'pdf'
            };

            const representation = loader.determineRepresentation(file, viewer);
            expect(representation.representation).to.equal('pdf');
        });

        it('should not return a representation if there is no match', () => {
            const viewer = {
                REP: 'xlsx'
            };

            const representation = loader.determineRepresentation(file, viewer);
            expect(representation).to.be.undefined;
        });
    });
});
