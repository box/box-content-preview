/* eslint-disable no-unused-expressions */
import ImageAnnotator from '../ImageAnnotator';
import ImagePointThread from '../ImagePointThread';
import * as annotatorUtil from '../../annotatorUtil';
import * as imageAnnotatorUtil from '../imageAnnotatorUtil';

let annotator;
const sandbox = sinon.sandbox.create();

describe('lib/annotations/image/ImageAnnotator', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('annotations/image/__tests__/ImageAnnotator-test.html');
        annotator = new ImageAnnotator({
            annotatedElement: document.querySelector('.annotated-element'),
            annotationService: {},
            fileVersionID: 1
        });
    });

    afterEach(() => {
        sandbox.verifyAndRestore();

        annotator = null;
    });

    describe('getLocationFromEvent()', () => {
        let event;
        let target;
        beforeEach(() => {
            target = {
                nodeName: 'IMG',
                getBoundingClientRect: sandbox.stub(),
                getAttribute: sandbox.stub().withArgs('data-rotation-angle').returns(0)
            };
            event = {
                target
            };
        });

        afterEach(() => {
            event = undefined;
        });

        it('should not return a location if image isn\'t inside viewer', () => {
            const tempAnnotator = new ImageAnnotator({
                annotatedElement: document.createElement('div'),
                annotationService: {},
                fileVersionID: 1
            });
            target.nodeName = 'div';
            const location = tempAnnotator.getLocationFromEvent(event);
            expect(location).to.be.null;
        });

        it('should not return a location if click is on dialog', () => {
            sandbox.stub(annotatorUtil, 'findClosestDataType').returns('annotation-dialog');

            const location = annotator.getLocationFromEvent(event);
            expect(location).to.be.null;
        });

        it('should not return a location if click is on annotation indicator', () => {
            sandbox.stub(annotatorUtil, 'findClosestDataType').returns('annotation-indicator');

            const location = annotator.getLocationFromEvent(event);
            expect(location).to.be.null;
        });

        it('should return a valid point location if click is valid', () => {
            const x = 100;
            const y = 200;
            const dimensions = {
                x: 100,
                y: 200
            };
            const imageEl = annotator._annotatedElement.querySelector('img');
            sandbox.stub(annotatorUtil, 'findClosestDataType').returns('not-a-dialog');
            sandbox.stub(annotatorUtil, 'getScale').returns(1);
            sandbox.stub(imageAnnotatorUtil, 'getLocationWithoutRotation').returns([x, y]);

            target.getBoundingClientRect.returns(dimensions);

            const location = annotator.getLocationFromEvent(event);
// console.error(location.imageEl, location.dimensions)
            expect(location).to.deep.equal({
                x,
                y,
                imageEl,
                dimensions
            });
        });
    });

    describe('createAnnotationThread()', () => {
        it('should create, add point thread to internal map, and return it', () => {
            sandbox.stub(annotatorUtil, 'validateThreadParams').returns(true);
            sandbox.stub(annotator, 'addThreadToMap');
            sandbox.stub(annotator, 'handleValidationError');
            const thread = annotator.createAnnotationThread([], {}, 'point');

            expect(annotator.addThreadToMap).to.have.been.called;
            expect(thread instanceof ImagePointThread).to.be.true;
            expect(annotator.handleValidationError).to.not.be.called;
        });

        it('should emit error and return undefined if thread params are invalid', () => {
            sandbox.stub(annotatorUtil, 'validateThreadParams').returns(false);
            sandbox.stub(annotator, 'handleValidationError');
            const thread = annotator.createAnnotationThread([], {}, 'point');
            expect(thread instanceof ImagePointThread).to.be.false;
            expect(annotator.handleValidationError).to.be.called;
        });
    });

    describe('hideAllAnnotations()', () => {
        it('should hide all annotations on image', () => {
            annotator.hideAllAnnotations();
            const annotation = document.querySelector('.bp-point-annotation-btn');
            const classList = Array.from(annotation.classList);
            expect(classList).to.include('bp-is-hidden');
        });
    });

    describe('showAllAnnotations()', () => {
        it('should show all annotations on image', () => {
            annotator.showAllAnnotations();
            const annotation = document.querySelector('.bp-point-annotation-btn');
            const classList = Array.from(annotation.classList);
            expect(classList).to.not.include('bp-is-hidden');
        });
    });

    describe('renderAnnotations()', () => {
        let hide;
        let show;
        beforeEach(() => {
            hide = sandbox.stub(annotatorUtil, 'hideElement');
            show = sandbox.stub(annotatorUtil, 'showElement');
            Object.defineProperty(Object.getPrototypeOf(ImageAnnotator.prototype), 'renderAnnotations', {
                value: sandbox.stub()
            });
        });

        it('should do nothing if the annotator is not allowed to annotate', () => {
            annotator._annotationService.canAnnotate = false;
            annotator.renderAnnotations();
            expect(hide).to.not.be.called;
            expect(show).to.not.be.called;
        });

        it('should not hide the annotate button if the image has not been rotated', () => {
            annotator._annotationService.canAnnotate = true;
            annotator.renderAnnotations(0);
            expect(hide).to.not.be.called;
            expect(show).to.be.called;
        });

        it('should hide the annotate button if the image has been rotated', () => {
            annotator._annotationService.canAnnotate = true;
            annotator.renderAnnotations(180);
            expect(hide).to.be.called;
            expect(show).to.not.be.called;
        });
    });
});
