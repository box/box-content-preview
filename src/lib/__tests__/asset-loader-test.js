import AssetLoader from '../asset-loader';

const loader = new AssetLoader();
const sandbox = sinon.sandbox.create();

describe('asset-loader', () => {
    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    describe('determineViewer()', () => {
        loader.viewers = [{
            REPRESENTATION: 'pdf',
            EXTENSIONS: ['pdf'],
            CONSTRUCTOR: 'Adobe'
        }, {
            REPRESENTATION: 'original',
            EXTENSIONS: ['pdf'],
            CONSTRUCTOR: 'Document'
        }, {
            REPRESENTATION: 'pdf',
            EXTENSIONS: ['pdf'],
            CONSTRUCTOR: 'SomeOtherPDFViewer'
        }];

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
                        representation: 'original'
                    }, {
                        representation: 'pdf'
                    }]
                }
            };

            const viewer = loader.determineViewer(file, ['Adobe']);

            expect(viewer).to.deep.equal({
                REPRESENTATION: 'original',
                EXTENSIONS: ['pdf'],
                CONSTRUCTOR: 'Document'
            });
        });
    });
});
