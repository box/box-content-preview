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

    describe('determineAnnotator()', () => {
        it('should choose the first annotator that matches the viewer', () => {
            const viewer = 'Document';
            const annotator = loader.determineAnnotator(viewer);
            expect(annotator.NAME).to.equal(viewer);
        });

        it('should not choose a disabled annotator', () => {
            const annotator = loader.determineAnnotator('Image', ['Image']);
            expect(annotator).to.be.undefined;
        });

        it('should not return a annotator if no matching annotator is found', () => {
            const annotator = loader.determineAnnotator('Swf');
            expect(annotator).to.be.undefined;
        });
    });
});
