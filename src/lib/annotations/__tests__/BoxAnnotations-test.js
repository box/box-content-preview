/* eslint-disable no-unused-expressions */
import BoxAnnotations from '../BoxAnnotations';
import { TYPES } from '../annotationConstants';
import DrawingModeController from '../drawing/DrawingModeController';

let loader;
let stubs;
const sandbox = sinon.sandbox.create();

describe('lib/annotators/BoxAnnotations', () => {
    beforeEach(() => {
        stubs = {};
        loader = new BoxAnnotations();
    });

    afterEach(() => {
        sandbox.verifyAndRestore();

        if (typeof loader.destroy === 'function') {
            loader.destroy();
        }

        loader = null;
        stubs = null;
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
        beforeEach(() => {
            stubs.instantiateControllers = sandbox.stub(loader, 'instantiateControllers');
        });

        it('should choose the first annotator that matches the viewer', () => {
            const viewer = 'Document';
            const annotator = loader.determineAnnotator(viewer);
            expect(annotator.NAME).to.equal(viewer);
            expect(stubs.instantiateControllers).to.be.called;
        });

        it('should not choose a disabled annotator', () => {
            const annotator = loader.determineAnnotator('Image', ['Image']);
            expect(annotator).to.be.undefined;
            expect(stubs.instantiateControllers).to.be.called;
        });

        it('should not return a annotator if no matching annotator is found', () => {
            const annotator = loader.determineAnnotator('Swf');
            expect(annotator).to.be.undefined;
            expect(stubs.instantiateControllers).to.be.called;
        });
    });

    describe('instantiateControllers()', () => {
        it('Should do nothing when a controller exists', () => {
            const config = {
                CONTROLLERS: 'not empty'
            };

            expect(() => loader.instantiateControllers(config)).to.not.throw();
        });

        it('Should do nothing when given an undefined object', () => {
            const config = undefined;
            expect(() => loader.instantiateControllers(config)).to.not.throw();
        });

        it('Should do nothing when config has no types', () => {
            const config = {
                TYPE: undefined
            };
            expect(() => loader.instantiateControllers(config)).to.not.throw();
        });

        it('Should instantiate controllers and assign them to the CONTROLLERS attribute', () => {
            const config = {
                TYPE: [TYPES.draw, 'typeWithoutController']
            };

            loader.instantiateControllers(config);
            expect(config.CONTROLLERS).to.not.equal(undefined);
            expect(config.CONTROLLERS[TYPES.draw] instanceof DrawingModeController).to.be.truthy;
            const assignedControllers = Object.keys(config.CONTROLLERS);
            expect(assignedControllers.length).to.equal(1);
        });
    });
});
