/* eslint-disable no-unused-expressions */
import AssetLoader from '../asset-loader';
import * as util from '../../util';

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
            expect(loader.determineViewer).to.have.been.called;
        });

        it('should return false if loader can\'t find a viewer to match the file', () => {
            sandbox.stub(loader, 'determineViewer').returns(null);

            expect(loader.canLoad({})).to.be.false;
            expect(loader.determineViewer).to.have.been.called;
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
                REPRESENTATION: 'pdf',
                EXTENSIONS: ['pdf'],
                CONSTRUCTOR: 'Adobe'
            }, {
                REPRESENTATION: 'ORIGINAL',
                EXTENSIONS: ['pdf'],
                CONSTRUCTOR: 'Document'
            }, {
                REPRESENTATION: 'pdf',
                EXTENSIONS: ['pdf'],
                CONSTRUCTOR: 'SomeOtherPDFViewer'
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
            expect(viewer).to.deep.equal({
                REPRESENTATION: 'pdf',
                EXTENSIONS: ['pdf'],
                CONSTRUCTOR: 'Adobe'
            });
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
            expect(viewer).to.deep.equal({
                REPRESENTATION: 'ORIGINAL',
                EXTENSIONS: ['pdf'],
                CONSTRUCTOR: 'Document'
            });
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
        it('should return a representation based on the file and viewer', () => {
            const file = {
                representations: {
                    entries: [{
                        representation: 'ORIGINAL'
                    }, {
                        representation: 'pdf'
                    }]
                }
            };
            const viewer = {
                REPRESENTATION: 'pdf'
            };

            const representation = loader.determineRepresentation(file, viewer);
            expect(representation).to.deep.equal({
                representation: 'pdf'
            });
        });

        it('should not return a representation if there is no match', () => {
            const file = {
                representations: {
                    entries: [{
                        representation: 'ORIGINAL'
                    }, {
                        representation: 'pdf'
                    }]
                }
            };
            const viewer = {
                REPRESENTATION: 'xlsx'
            };

            const representation = loader.determineRepresentation(file, viewer);
            expect(representation).to.be.undefined;
        });
    });

    describe('determineRepresentationStatus()', () => {
        it('should return success promise from rep status', () => {
            const promise = Promise.resolve();
            const repStatus = {
                success: sandbox.stub().returns(promise)
            };

            const status = loader.determineRepresentationStatus(repStatus);
            expect(status).to.equal(promise);
        });
    });

    describe('load()', () => {
        it('should create an asset URL and load the relevant stylesheets and scripts', () => {
            const viewer = {
                STYLESHEETS: [],
                SCRIPTS: []
            };
            const location = {};
            const promise = Promise.resolve();

            sandbox.stub(util, 'createAssetUrlCreator').returns(() => {});
            sandbox.stub(util, 'loadStylesheets');
            sandbox.stub(util, 'loadScripts').returns(promise);

            const result = loader.load(viewer, location);
            expect(util.createAssetUrlCreator).to.have.been.calledWith(location);
            expect(util.loadStylesheets).to.have.been.called;
            expect(util.loadScripts).to.have.been.called;
            expect(result).to.equal(promise);
        });
    });

    describe('prefetch()', () => {
        it('should not prefetch assets if representation status isn\'t successful', () => {
            sandbox.stub(loader, 'determineViewer');
            sandbox.stub(loader, 'determineRepresentation').returns({
                status: {
                    state: 'error'
                }
            });
            sandbox.stub(loader, 'prefetchAssets');

            loader.prefetch({}, '', {}, '', '');

            expect(loader.prefetchAssets).to.not.have.been.called;
        });

        it('it should determine viewer and representation and then prefetch assets', () => {
            const file = {};
            const token = 'someToken';
            const location = {};
            const viewer = {};

            sandbox.stub(loader, 'determineViewer').returns(viewer);
            sandbox.stub(loader, 'determineRepresentation').returns({
                links: {
                    content: {
                        url: ''
                    }
                },
                status: {
                    state: 'success'
                }
            });
            sandbox.stub(loader, 'prefetchAssets');

            loader.prefetch(file, token, location, 'someLink', 'somePass');

            expect(loader.determineViewer).to.have.been.calledWith(file);
            expect(loader.determineRepresentation).to.have.been.calledWith(file, viewer);
            expect(loader.prefetchAssets).to.have.been.calledWith(viewer, location);
        });

        it('should prefetch assets with XHR if viewer has xhr prefetch', () => {
            const url = 'someUrl';
            const token = 'someToken';
            const sharedLink = 'someLink';
            const password = 'somePass';

            sandbox.stub(loader, 'determineViewer').returns({
                PREFETCH: 'xhr'
            });
            sandbox.stub(loader, 'determineRepresentation').returns({
                content: {
                    url_template: 'someUrl'
                },
                status: {
                    state: 'success'
                }
            });
            sandbox.stub(loader, 'prefetchAssets');
            sandbox.stub(util, 'get');
            sandbox.stub(util, 'createContentUrl').returns(url);

            loader.prefetch({}, token, {}, sharedLink, password);

            expect(util.get).to.have.been.calledWith(url, 'any');
        });

        it('should prefetch assets via img tag if viewer has img prefetch', () => {
            const url = 'someUrl';
            const token = 'someToken';
            const sharedLink = 'someLink';
            const password = 'somePass';

            sandbox.stub(loader, 'determineViewer').returns({
                PREFETCH: 'img'
            });
            sandbox.stub(loader, 'determineRepresentation').returns({
                content: {
                    url_template: 'someUrl'
                },
                status: {
                    state: 'success'
                }
            });
            sandbox.stub(loader, 'prefetchAssets');
            sandbox.stub(util, 'createContentUrl');

            loader.prefetch({}, token, {}, sharedLink, password);

            expect(util.createContentUrl).to.have.been.calledWith(url, token, sharedLink, password);
        });

        it('should not prefetch assets if viewer does not have prefetch method defined', () => {
            const url = 'someUrl';
            const token = 'someToken';
            const sharedLink = 'someLink';
            const password = 'somePass';

            sandbox.stub(loader, 'determineViewer').returns({});
            sandbox.stub(loader, 'determineRepresentation').returns({
                links: {
                    content: {
                        url
                    }
                },
                status: {
                    state: 'success'
                }
            });
            sandbox.stub(loader, 'prefetchAssets');
            sandbox.stub(util, 'get');
            sandbox.stub(util, 'createContentUrl');

            loader.prefetch({}, token, {}, sharedLink, password);

            expect(util.get).to.have.not.been.called;
            expect(util.createContentUrl).to.have.not.been.called;
        });
    });

    describe('prefetchAssets()', () => {
        it('should create an asset URL and prefetch the relevant stylesheets and scripts', () => {
            const viewer = {
                STYLESHEETS: [],
                SCRIPTS: []
            };
            const location = {};

            sandbox.stub(util, 'createAssetUrlCreator').returns(() => {});
            sandbox.stub(util, 'prefetchAssets');

            loader.prefetchAssets(viewer, location);
            expect(util.createAssetUrlCreator).to.have.been.calledWith(location);
            expect(util.prefetchAssets).to.have.been.calledTwice;
        });
    });
});
