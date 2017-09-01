/* eslint-disable no-unused-expressions */
import ImagePointDialog from '../ImagePointDialog';
import ImagePointThread from '../ImagePointThread';
import * as annotatorUtil from '../../annotatorUtil';
import { STATES } from '../../annotationConstants';
import * as imageAnnotatorUtil from '../imageAnnotatorUtil';

let thread;
const sandbox = sinon.sandbox.create();

describe('lib/annotations/image/ImagePointThread', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('annotations/image/__tests__/ImagePointThread-test.html');

        thread = new ImagePointThread({
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

        thread.dialog = {
            position: sandbox.stub()
        };
        thread.isMobile = false;
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    describe('show', () => {
        it('should position and show the thread', () => {
            sandbox.stub(imageAnnotatorUtil, 'getBrowserCoordinatesFromLocation').returns([1, 2]);
            sandbox.stub(annotatorUtil, 'showElement');
            sandbox.stub(thread, 'showDialog');

            thread.show();

            expect(imageAnnotatorUtil.getBrowserCoordinatesFromLocation).to.have.been.calledWith(
                thread.location,
                thread.annotatedElement
            );
            expect(annotatorUtil.showElement).to.have.been.calledWith(thread.element);
        });

        it('should show the dialog if the state is pending', () => {
            sandbox.stub(imageAnnotatorUtil, 'getBrowserCoordinatesFromLocation').returns([1, 2]);
            sandbox.stub(annotatorUtil, 'showElement');
            sandbox.stub(thread, 'showDialog');

            thread.state = STATES.pending;
            thread.show();

            expect(thread.showDialog).to.have.been.called;
            expect(thread.dialog.position).to.have.been.called;
        });

        it('should not show the dialog if the state is not pending', () => {
            sandbox.stub(imageAnnotatorUtil, 'getBrowserCoordinatesFromLocation').returns([1, 2]);
            sandbox.stub(annotatorUtil, 'showElement');
            sandbox.stub(thread, 'showDialog');

            thread.state = STATES.inactive;
            thread.show();

            expect(thread.showDialog).to.not.have.been.called;
        });

        it('should not re-position the dialog if pending but on a mobile device', () => {
            thread.isMobile = true;
            thread.state = STATES.pending;

            sandbox.stub(imageAnnotatorUtil, 'getBrowserCoordinatesFromLocation').returns([1, 2]);
            sandbox.stub(annotatorUtil, 'showElement');
            sandbox.stub(thread, 'showDialog');

            thread.show();

            expect(imageAnnotatorUtil.getBrowserCoordinatesFromLocation).to.have.been.calledWith(
                thread.location,
                thread.annotatedElement
            );

            expect(thread.dialog.position).to.not.have.been.called;
            expect(annotatorUtil.showElement).to.have.been.calledWith(thread.element);
            expect()
        });
    });

    describe('createDialog', () => {
        it('should initialize an appropriate dialog', () => {
            thread.createDialog();
            expect(thread.dialog instanceof ImagePointDialog).to.be.true;
        });
    });
});
