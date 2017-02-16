/* eslint-disable no-unused-expressions */
import AssetLoader from '../asset-loader';

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

    // describe('prefetch()', () => {
    //     it('should not prefetch assets if representation status isn\'t successful', () => {
    //         sandbox.stub(loader, 'determineViewer');
    //         sandbox.stub(loader, 'determineRepresentation').returns({
    //             status: {
    //                 state: 'error'
    //             }
    //         });
    //         sandbox.stub(loader, 'prefetchAssets');

    //         loader.prefetch({}, '', '', '', {});

    //         expect(loader.prefetchAssets).to.not.be.called;
    //     });

    //     it('it should determine viewer and representation and then prefetch assets via xhr', () => {
    //         const url = 'someUrl';
    //         const file = {};
    //         const token = 'someToken';
    //         const sharedLink = 'someLink';
    //         const password = 'somePass';
    //         const location = {};
    //         const viewer = {
    //             PREFETCH: 'xhr'
    //         };

    //         sandbox.stub(loader, 'determineViewer').returns(viewer);
    //         sandbox.stub(loader, 'determineRepresentation').returns({
    //             content: {
    //                 url_template: url
    //             },
    //             status: {
    //                 state: 'success'
    //             }
    //         });
    //         sandbox.stub(util, 'get');
    //         sandbox.spy(util, 'appendAuthParams');
    //         sandbox.stub(loader, 'prefetchAssets');

    //         loader.prefetch(file, token, sharedLink, password, location);

    //         expect(loader.determineViewer).to.be.calledWith(file);
    //         expect(loader.determineRepresentation).to.be.calledWith(file, viewer);
    //         expect(loader.prefetchAssets).to.be.calledWith(viewer, location);
    //         expect(util.appendAuthParams).to.be.calledWith(url, token, sharedLink, password);
    //         expect(util.get).to.be.calledWith('someUrl?access_token=someToken&shared_link=someLink&shared_link_password=somePass', 'any');
    //     });

    //     it('should prefetch assets via img tag if prefetch strategy indicates it', () => {
    //         const url = 'someUrl';
    //         const file = {};
    //         const token = 'someToken';
    //         const sharedLink = 'someLink';
    //         const password = 'somePass';
    //         const location = {};
    //         const viewer = {
    //             PREFETCH: 'img'
    //         };

    //         sandbox.stub(loader, 'determineViewer').returns(viewer);
    //         sandbox.stub(loader, 'determineRepresentation').returns({
    //             content: {
    //                 url_template: url
    //             },
    //             status: {
    //                 state: 'success'
    //             }
    //         });
    //         sandbox.stub(util, 'get');
    //         sandbox.spy(util, 'appendAuthParams');
    //         sandbox.stub(loader, 'prefetchAssets');

    //         loader.prefetch(file, token, sharedLink, password, location);

    //         expect(loader.determineViewer).to.be.calledWith(file);
    //         expect(loader.determineRepresentation).to.be.calledWith(file, viewer);
    //         expect(loader.prefetchAssets).to.be.calledWith(viewer, location);
    //         expect(util.appendAuthParams).to.be.calledWith(url, token, sharedLink, password);
    //         expect(util.get).to.not.be.called;
    //     });
    // });
});
