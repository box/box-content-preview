/* eslint-disable no-unused-expressions */
import DocPointDialog from '../DocPointDialog';
import DocPointThread from '../DocPointThread';
import AnnotationThread from '../../AnnotationThread';
import * as annotatorUtil from '../../annotatorUtil';
import * as docAnnotatorUtil from '../docAnnotatorUtil';
import { STATES } from '../../annotationConstants';

let pointThread;
const sandbox = sinon.sandbox.create();

describe('lib/annotations/doc/DocPointThread', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('annotations/doc/__tests__/DocPointThread-test.html');

        pointThread = new DocPointThread({
            annotatedElement: document.querySelector('.annotated-element'),
            annotations: [],
            annotationService: {},
            fileVersionId: 1,
            location: {},
            threadID: 2,
            type: 'point',
            permissions: {
                canAnnotate: true
            }
        });
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        pointThread = null;
    });

    describe('showDialog', () => {
        it('should not call parent showDialog if user can annotate and there is a selection present', () => {
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
            pointThread.permissions.canAnnotate = false;
            Object.defineProperty(Object.getPrototypeOf(DocPointThread.prototype), 'showDialog', {
                value: sandbox.stub()
            });

            pointThread.showDialog();

            expect(AnnotationThread.prototype.showDialog).to.have.been.called;
        });

        it('should call parent showDialog if there isn\'t a selection present', () => {
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
                pointThread.location,
                pointThread.annotatedElement
            );
            expect(annotatorUtil.showElement).to.have.been.calledWith(pointThread.element);
        });

        it('should show the dialog if the state is pending', () => {
            sandbox.stub(docAnnotatorUtil, 'getBrowserCoordinatesFromLocation').returns([1, 2]);
            sandbox.stub(annotatorUtil, 'showElement');
            sandbox.stub(pointThread, 'showDialog');

            pointThread.state = STATES.pending;
            pointThread.show();

            expect(pointThread.showDialog).to.have.been.called;
        });

        it('should not show the dialog if the state is not pending', () => {
            sandbox.stub(docAnnotatorUtil, 'getBrowserCoordinatesFromLocation').returns([1, 2]);
            sandbox.stub(annotatorUtil, 'showElement');
            sandbox.stub(pointThread, 'showDialog');

            pointThread.state = STATES.inactive;
            pointThread.show();

            expect(pointThread.showDialog).to.not.have.been.called;
        });
    });

    describe('createDialog', () => {
        it('should initialize an appropriate dialog', () => {
            pointThread.createDialog();
            expect(pointThread.dialog instanceof DocPointDialog).to.be.true;
        });
    });
});
