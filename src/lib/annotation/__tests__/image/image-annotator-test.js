/* eslint-disable no-unused-expressions */
import ImageAnnotator from '../../image/image-annotator';
import ImagePointThread from '../../image/image-point-thread';
import * as annotatorUtil from '../../annotator-util';
import * as imageAnnotatorUtil from '../../image/image-annotator-util';

let annotator;
const sandbox = sinon.sandbox.create();

describe('image-annotator', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('annotation/__tests__/image/image-annotator-test.html');

        annotator = new ImageAnnotator({
            annotatedElement: document.querySelector('.annotated-element'),
            annotationService: {},
            fileVersionID: 1
        });
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    describe('getLocationFromEvent()', () => {
        it('should not return a location if image isn\'t inside viewer', () => {
            sandbox.stub(annotatorUtil, 'findClosestElWithClass').returns(document.createElement('div'));

            const location = annotator.getLocationFromEvent({});
            expect(location).to.be.null;
        });

        it('should not return a location if click is on dialog', () => {
            sandbox.stub(annotatorUtil, 'findClosestElWithClass').returns(annotator._annotatedElement);
            sandbox.stub(annotatorUtil, 'findClosestDataType').returns('annotation-dialog');

            const location = annotator.getLocationFromEvent({});
            expect(location).to.be.null;
        });

        it('should not return a location if click is on annotation indicator', () => {
            sandbox.stub(annotatorUtil, 'findClosestElWithClass').returns(annotator._annotatedElement);
            sandbox.stub(annotatorUtil, 'findClosestDataType').returns('annotation-indicator');

            const location = annotator.getLocationFromEvent({});
            expect(location).to.be.null;
        });

        it('should not return a location if click isn\'t in image area', () => {
            sandbox.stub(annotatorUtil, 'findClosestElWithClass').returns(annotator._annotatedElement);
            sandbox.stub(annotatorUtil, 'findClosestDataType').returns('not-a-dialog');

            const location = annotator.getLocationFromEvent({
                clientX: -1,
                clientY: -1
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
            const imageEl = annotator._annotatedElement.querySelector('img');
            sandbox.stub(annotatorUtil, 'findClosestElWithClass').returns(annotator._annotatedElement);
            sandbox.stub(annotatorUtil, 'findClosestDataType').returns('not-a-dialog');
            sandbox.stub(annotatorUtil, 'getScale').returns(1);
            sandbox.stub(imageAnnotatorUtil, 'getLocationWithoutRotation').returns([x, y]);

            const location = annotator.getLocationFromEvent({});
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
            sandbox.stub(annotator, 'addThreadToMap');
            const thread = annotator.createAnnotationThread([], {}, 'point');

            expect(annotator.addThreadToMap).to.have.been.called;
            expect(thread instanceof ImagePointThread).to.be.true;
        });
    });

    describe('hideAllAnnotations()', () => {
        it('should hide all annotations on image', () => {
            annotator.hideAllAnnotations();
            const annotation = document.querySelector('.box-preview-point-annotation-btn');
            const classList = Array.from(annotation.classList);
            expect(classList).to.include('box-preview-is-hidden');
        });
    });

    describe('showAllAnnotations()', () => {
        it('should show all annotations on image', () => {
            annotator.showAllAnnotations();
            const annotation = document.querySelector('.box-preview-point-annotation-btn');
            const classList = Array.from(annotation.classList);
            expect(classList).to.not.include('box-preview-is-hidden');
        });
    });
});
