/* eslint-disable no-unused-expressions */
import ImageAnnotator from '../ImageAnnotator';
import ImagePointThread from '../ImagePointThread';
import * as annotatorUtil from '../../annotatorUtil';
import * as imageAnnotatorUtil from '../imageAnnotatorUtil';
import { SELECTOR_ANNOTATION_POINT_BUTTON } from '../../annotationConstants';

let annotator;
const sandbox = sinon.sandbox.create();

describe('lib/annotations/image/ImageAnnotator', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('annotations/image/__tests__/ImageAnnotator-test.html');

        annotator = new ImageAnnotator({
            canAnnotate: true,
            container: document,
            annotationService: {},
            fileVersionId: 1,
            isMobile: false,
            options: {},
            previewUI: {
                getAnnotateButton: () => {}
            }
        });
        annotator.annotatedElement = annotator.getAnnotatedEl(document);
        annotator.annotationService = {};
    });

    afterEach(() => {
        sandbox.verifyAndRestore();

        annotator = null;
    });

    describe('getAnnotatedEl()', () => {
        it('should return the annotated element as the document', () => {
            expect(annotator.annotatedElement).to.not.be.null;
        });
    });

    describe('getLocationFromEvent()', () => {
        it('should not return a location if image isn\'t inside viewer', () => {
            annotator.annotatedElement = document.createElement('div');
            const location = annotator.getLocationFromEvent({
                target: {
                    nodeName: 'not-annotated'
                }
            });
            expect(location).to.be.null;
        });

        it('should return a valid point location if click is valid', () => {
            const x = 100;
            const y = 200;
            const dimensions = {
                x: 100,
                y: 200
            };
            const imageEl = annotator.annotatedElement.querySelector('img');
            sandbox.stub(annotatorUtil, 'getScale').returns(1);
            sandbox.stub(imageAnnotatorUtil, 'getLocationWithoutRotation').returns([x, y]);

            const location = annotator.getLocationFromEvent({
                target: imageEl
            });
            expect(location).to.deep.equal({
                x,
                y,
                imageEl,
                dimensions,
                page: 1
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
            const annotation = document.querySelector(SELECTOR_ANNOTATION_POINT_BUTTON);
            const classList = Array.from(annotation.classList);
            expect(classList).to.include('bp-is-hidden');
        });
    });

    describe('showAllAnnotations()', () => {
        it('should show all annotations on image', () => {
            annotator.showAllAnnotations();
            const annotation = document.querySelector(SELECTOR_ANNOTATION_POINT_BUTTON);
            const classList = Array.from(annotation.classList);
            expect(classList).to.not.include('bp-is-hidden');
        });
    });
});
