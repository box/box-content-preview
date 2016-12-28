/* eslint-disable no-unused-expressions */
import DocPointDialog from '../../doc/doc-point-dialog';
import DocPointThread from '../../doc/doc-point-thread';
import AnnotationThread from '../../annotation-thread';
import * as annotatorUtil from '../../annotator-util';
import * as constants from '../../annotation-constants';
import * as docAnnotatorUtil from '../../doc/doc-annotator-util';

let pointThread;
const sandbox = sinon.sandbox.create();

describe('doc-point-thread', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('annotations/__tests__/doc/doc-point-thread-test.html');

        pointThread = new DocPointThread({
            annotatedElement: document.querySelector('.annotated-element'),
            annotations: [],
            annotationService: {},
            fileVersionID: 1,
            location: {},
            threadID: 2,
            type: 'point'
        });
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        pointThread = null;
    });

    describe('showDialog', () => {
        it('should not call parent showDialog if user can annotate and there is a selection present', () => {
            pointThread._annotationService.canAnnotate = true;
            sandbox.stub(docAnnotatorUtil, 'isSelectionPresent').returns(true);

            // This stubs out a parent method by forcing the method we care about
            // in the prototype of the prototype of DocPointThread (ie
            // AnnotationThread's prototype) to be a stub
            Object.defineProperty(Object.getPrototypeOf(DocPointThread.prototype), 'showDialog', {
                value: sandbox.stub()
            });

            pointThread.showDialog();

            expect(AnnotationThread.prototype.showDialog).to.not.have.been.called;
        });

        it('should call parent showDialog if user can\'t annotate', () => {
            pointThread._annotationService.canAnnotate = false;
            Object.defineProperty(Object.getPrototypeOf(DocPointThread.prototype), 'showDialog', {
                value: sandbox.stub()
            });

            pointThread.showDialog();

            expect(AnnotationThread.prototype.showDialog).to.have.been.called;
        });

        it('should call parent showDialog if there isn\'t a selection present', () => {
            pointThread._annotationService.canAnnotate = true;
            sandbox.stub(docAnnotatorUtil, 'isSelectionPresent').returns(false);
            Object.defineProperty(Object.getPrototypeOf(DocPointThread.prototype), 'showDialog', {
                value: sandbox.stub()
            });

            pointThread.showDialog();

            expect(AnnotationThread.prototype.showDialog).to.have.been.called;
        });
    });

    describe('show', () => {
        it('should position and show the thread', () => {
            sandbox.stub(docAnnotatorUtil, 'getBrowserCoordinatesFromLocation').returns([1, 2]);
            sandbox.stub(annotatorUtil, 'showElement');

            pointThread.show();

            expect(docAnnotatorUtil.getBrowserCoordinatesFromLocation).to.have.been.calledWith(
                pointThread._location,
                pointThread._annotatedElement);
            expect(annotatorUtil.showElement).to.have.been.calledWith(pointThread._element);
        });

        it('should show the dialog if the state is pending', () => {
            sandbox.stub(docAnnotatorUtil, 'getBrowserCoordinatesFromLocation').returns([1, 2]);
            sandbox.stub(annotatorUtil, 'showElement');
            sandbox.stub(pointThread, 'showDialog');

            pointThread._state = constants.ANNOTATION_STATE_PENDING;
            pointThread.show();

            expect(pointThread.showDialog).to.have.been.called;
        });

        it('should not show the dialog if the state is not pending', () => {
            sandbox.stub(docAnnotatorUtil, 'getBrowserCoordinatesFromLocation').returns([1, 2]);
            sandbox.stub(annotatorUtil, 'showElement');
            sandbox.stub(pointThread, 'showDialog');

            pointThread._state = constants.ANNOTATION_STATE_INACTIVE;
            pointThread.show();

            expect(pointThread.showDialog).to.not.have.been.called;
        });
    });

    describe('createDialog', () => {
        it('should initialize an appropriate dialog', () => {
            pointThread.createDialog();
            expect(pointThread._dialog instanceof DocPointDialog).to.be.true;
        });
    });
});
