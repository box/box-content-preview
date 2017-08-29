/* eslint-disable no-unused-expressions */
import BoxAnnotations from '../BoxAnnotations';

let loader;
const sandbox = sinon.sandbox.create();

describe('lib/annotators/BoxAnnotations', () => {
    beforeEach(() => {
        loader = new BoxAnnotations();
    });

    afterEach(() => {
        sandbox.verifyAndRestore();

        if (typeof loader.destroy === 'function') {
            loader.destroy();
        }

        loader = null;
    });

    describe('getAnnotators()', () => {
        it('should return the loader\'s annotators', () => {
            expect(loader.getAnnotators()).to.deep.equal(loader.annotators);
        });

        it('should return an empty array if the loader doesn\'t have annotators', () => {
            loader.annotators = [];
            expect(loader.getAnnotators()).to.deep.equal([]);
        });
    });

    describe('getAnnotatorsForViewer()', () => {
        it('should return undefined if the annotator does not exist', () => {
            const annotator = loader.getAnnotatorsForViewer('not_supported_type');
            expect(annotator).to.be.undefined;
        });

        it('should return the correct annotator for the viewer name', () => {
            const name = 'Document';
            const annotator = loader.getAnnotatorsForViewer(name);
            expect(annotator.NAME).to.equal(name); // First entry is Document annotator
        });

        it('should return nothing if the viewer requested is disabled', () => {
            const annotator = loader.getAnnotatorsForViewer('Document', ['Document']);
            expect(annotator).to.be.undefined;
        });
    });

    describe('determineAnnotator()', () => {
        it('should choose the first annotator that matches the viewer', () => {
            const viewer = 'Document';
            const annotator = loader.determineAnnotator(viewer);
            expect(annotator.NAME).to.equal(viewer);
        });

        it('should not choose a disabled annotator', () => {
            const annotator = loader.determineAnnotator('Image', {}, ['Image']);
            expect(annotator).to.be.null;
        });

        it('should not return a annotator if no matching annotator is found', () => {
            const annotator = loader.determineAnnotator('Swf');
            expect(annotator).to.be.null;
        });

        it('should return a copy of the annotator that matches', () => {
            const viewer = 'Document';
            const docAnnotator = {
                NAME: viewer,
                VIEWER: ['Document']
            };
            loader.annotators = [docAnnotator];
            const annotator = loader.determineAnnotator(viewer);
            docAnnotator.NAME = 'another_name';
            expect(annotator.NAME).to.equal(viewer);
            expect(annotator.NAME).to.not.equal(docAnnotator.NAME);
        });

        it('should return null if the config for the viewer disables annotations', () => {
            const config = {
                enabled: false
            };
            const annotator = loader.determineAnnotator('Document', config);
            expect(annotator).to.be.null;
        });

        it('should filter disabled annotation types from the annotator.TYPE', () => {
            const config = {
                enabled: true,
                disabledTypes: ['point']
            };
            const docAnnotator = {
                NAME: 'Document',
                VIEWER: ['Document'],
                TYPE: ['point', 'highlight']
            };
            loader.annotators = [docAnnotator];
            const annotator = loader.determineAnnotator('Document', config);
            expect(annotator.TYPE.includes('point')).to.be.false;
            expect(annotator.TYPE.includes('highlight')).to.be.true;
        });
    });
});
