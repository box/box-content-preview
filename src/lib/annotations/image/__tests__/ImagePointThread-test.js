/* eslint-disable no-unused-expressions */
import ImagePointDialog from '../ImagePointDialog';
import ImagePointThread from '../ImagePointThread';
import * as annotatorUtil from '../../annotatorUtil';
import * as constants from '../../annotationConstants';
import * as imageAnnotatorUtil from '../imageAnnotatorUtil';

let pointThread;
const sandbox = sinon.sandbox.create();

describe('lib/annotations/image/ImagePointThread', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('annotations/image/__tests__/ImagePointThread-test.html');

        pointThread = new ImagePointThread({
            annotatedElement: document.querySelector('.annotated-element'),
            annotations: [],
            annotationService: {},
            fileVersionId: 1,
            location: {},
            threadID: 2,
            type: 'point'
        });
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    describe('show', () => {
        it('should position and show the thread', () => {
            sandbox.stub(imageAnnotatorUtil, 'getBrowserCoordinatesFromLocation').returns([1, 2]);
            sandbox.stub(annotatorUtil, 'showElement');

            pointThread.show();

            expect(imageAnnotatorUtil.getBrowserCoordinatesFromLocation).to.have.been.calledWith(
                pointThread.location,
                pointThread.annotatedElement);
            expect(annotatorUtil.showElement).to.have.been.calledWith(pointThread.element);
        });

        it('should show the dialog if the state is pending', () => {
            sandbox.stub(imageAnnotatorUtil, 'getBrowserCoordinatesFromLocation').returns([1, 2]);
            sandbox.stub(annotatorUtil, 'showElement');
            sandbox.stub(pointThread, 'showDialog');

            pointThread.state = constants.ANNOTATION_STATE_PENDING;
            pointThread.show();

            expect(pointThread.showDialog).to.have.been.called;
        });

        it('should not show the dialog if the state is not pending', () => {
            sandbox.stub(imageAnnotatorUtil, 'getBrowserCoordinatesFromLocation').returns([1, 2]);
            sandbox.stub(annotatorUtil, 'showElement');
            sandbox.stub(pointThread, 'showDialog');

            pointThread.state = constants.ANNOTATION_STATE_INACTIVE;
            pointThread.show();

            expect(pointThread.showDialog).to.not.have.been.called;
        });
    });

    describe('createDialog', () => {
        it('should initialize an appropriate dialog', () => {
            pointThread.createDialog();
            expect(pointThread.dialog instanceof ImagePointDialog).to.be.true;
        });
    });
});
