/* eslint-disable no-unused-expressions */
import ImagePointDialog from '../image-point-dialog';
import ImagePointThread from '../image-point-thread';
import * as annotatorUtil from '../../annotator-util';
import * as constants from '../../annotation-constants';
import * as imageAnnotatorUtil from '../image-annotator-util';

let pointThread;
const sandbox = sinon.sandbox.create();

describe('image-point-thread', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('annotations/image/__tests__/image-point-thread-test.html');

        pointThread = new ImagePointThread({
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
    });

    describe('show', () => {
        it('should position and show the thread', () => {
            sandbox.stub(imageAnnotatorUtil, 'getBrowserCoordinatesFromLocation').returns([1, 2]);
            sandbox.stub(annotatorUtil, 'showElement');

            pointThread.show();

            expect(imageAnnotatorUtil.getBrowserCoordinatesFromLocation).to.have.been.calledWith(
                pointThread._location,
                pointThread._annotatedElement);
            expect(annotatorUtil.showElement).to.have.been.calledWith(pointThread._element);
        });

        it('should show the dialog if the state is pending', () => {
            sandbox.stub(imageAnnotatorUtil, 'getBrowserCoordinatesFromLocation').returns([1, 2]);
            sandbox.stub(annotatorUtil, 'showElement');
            sandbox.stub(pointThread, 'showDialog');

            pointThread._state = constants.ANNOTATION_STATE_PENDING;
            pointThread.show();

            expect(pointThread.showDialog).to.have.been.called;
        });

        it('should not show the dialog if the state is not pending', () => {
            sandbox.stub(imageAnnotatorUtil, 'getBrowserCoordinatesFromLocation').returns([1, 2]);
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
            expect(pointThread._dialog instanceof ImagePointDialog).to.be.true;
        });
    });
});
