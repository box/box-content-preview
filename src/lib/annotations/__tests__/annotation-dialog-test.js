/* eslint-disable no-unused-expressions */
import AnnotationDialog from '../annotation-dialog';
import * as annotatorUtil from '../annotator-util';
import * as constants from '../annotation-constants';

let annotationDialog;
const sandbox = sinon.sandbox.create();

describe('annotation-dialog', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('annotations/__tests__/annotation-dialog-test.html');

        annotationDialog = new AnnotationDialog({
            annotatedElement: document.querySelector('.annotated-element'),
            location: {},
            annotations: [],
            canAnnotate: true
        });
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    describe('destroy()', () => {
        it('should unbind DOM listeners and cleanup its HTML', () => {
            const unbindStub = sandbox.stub(annotationDialog, 'unbindDOMListeners');
            annotationDialog.destroy();
            expect(unbindStub).to.have.been.called;
            expect(annotationDialog._element).to.be.null;
        });
    });

    describe('show()', () => {
        it('should clear the hide timeout handler', () => {
            const clearTimeoutStub = sandbox.stub(window, 'clearTimeout');
            annotationDialog.show();
            expect(clearTimeoutStub).to.have.been.called;
            expect(annotationDialog._timeoutHandler).to.be.null;
        });

        it('should position the dialog', () => {
            const positionStub = sandbox.stub(annotationDialog, 'position');
            annotationDialog.show();
            expect(positionStub).to.have.been.called;
        });

        it('should hide the reply/edit/delete UI if user cannot annotate', () => {
            annotationDialog._canAnnotate = false;
            annotationDialog.show();
            expect(annotationDialog._element.classList.contains(constants.CLASS_CANNOT_ANNOTATE)).to.be.true;
        });
    });

    describe('hide()', () => {
        it('should hide dialog immediately if noDelay is true', () => {
            const clearTimeoutStub = sandbox.stub(window, 'clearTimeout');
            annotationDialog.hide(true);

            expect(annotationDialog._element.classList.contains('box-preview-is-hidden')).to.be.true;
            expect(clearTimeoutStub).to.have.been.called;
            expect(annotationDialog._timeoutHandler).to.be.null;
        });

        it('should start a hide timeout if noDelay is false', () => {
            const setTimeoutStub = sandbox.stub(window, 'setTimeout');
            annotationDialog.hide();
            expect(setTimeoutStub).to.have.been.called;
            expect(annotationDialog._timeoutHandler).to.not.be.null;
        });
    });

    describe('addAnnotation()', () => {
        it('should add annotation to the dialog and deactivate the reply area', () => {
            const addStub = sandbox.stub(annotationDialog, '_addAnnotationElement');
            const deactivateStub = sandbox.stub(annotationDialog, '_deactivateReply');
            annotationDialog.addAnnotation({});

            expect(addStub).to.have.been.called;
            expect(deactivateStub).to.have.been.called;
        });

        it('should hide the create section and show the show section if there are no annotations', () => {
            sandbox.stub(annotationDialog, '_addAnnotationElement');
            sandbox.stub(annotationDialog, '_deactivateReply');

            // Add dialog to DOM
            annotationDialog._annotatedElement.appendChild(annotationDialog._element);
            annotationDialog.addAnnotation({});

            const createSectionEl = document.querySelector('[data-section="create"]');
            const showSectionEl = document.querySelector('[data-section="show"]');
            expect(createSectionEl.classList.contains('box-preview-is-hidden')).to.be.true;
            expect(showSectionEl.classList.contains('box-preview-is-hidden')).to.be.false;
        });
    });

    describe('removeAnnotation()', () => {
        it('should remove annotation element and deactivate reply', () => {
            const deactivateStub = sandbox.stub(annotationDialog, '_deactivateReply');

            // Add dialog to DOM
            annotationDialog._annotatedElement.appendChild(annotationDialog._element);
            annotationDialog.addAnnotation({
                annotationID: 'someID',
                text: 'blah',
                user: {},
                permissions: {}
            });
            annotationDialog.removeAnnotation('someID');

            const annotationEl = document.querySelector('[data-annotation-id="someID"]');
            expect(annotationEl).to.be.null;
            expect(deactivateStub).to.have.been.called;
        });

        it('should not do anything if the specified annotation does not exist', () => {
            const deactivateStub = sandbox.stub(annotationDialog, '_deactivateReply');
            annotationDialog.removeAnnotation('someID');
            expect(deactivateStub).to.not.have.been.called;
        });
    });

    describe('setup()', () => {
        it('should set up HTML element, add annotations to the dialog, and bind DOM listeners', () => {
            const bindStub = sandbox.stub(annotationDialog, 'bindDOMListeners');

            annotationDialog.setup([{
                annotationID: 'someID',
                text: 'blah',
                user: {},
                permissions: {}
            }]);

            expect(annotationDialog._element).to.not.be.null;
            expect(annotationDialog._element.querySelector(['[data-annotation-id="someID"]'])).to.not.be.null;
            expect(bindStub).to.have.been.called;
        });
    });

    describe('bindDOMListeners()', () => {
        it('should bind DOM listeners', () => {
            const addListenerStub = sandbox.stub(annotationDialog._element, 'addEventListener');
            annotationDialog.bindDOMListeners();

            expect(addListenerStub).to.have.been.calledWith('keydown', sinon.match.func);
            expect(addListenerStub).to.have.been.calledWith('click', sinon.match.func);
            expect(addListenerStub).to.have.been.calledWith('mouseup', sinon.match.func);
            expect(addListenerStub).to.have.been.calledWith('mouseenter', sinon.match.func);
            expect(addListenerStub).to.have.been.calledWith('mouseleave', sinon.match.func);
        });
    });

    describe('unbindDOMListeners()', () => {
        it('should unbind DOM listeners', () => {
            const removeListenerStub = sandbox.stub(annotationDialog._element, 'removeEventListener');
            annotationDialog.unbindDOMListeners();

            expect(removeListenerStub).to.have.been.calledWith('keydown', sinon.match.func);
            expect(removeListenerStub).to.have.been.calledWith('click', sinon.match.func);
            expect(removeListenerStub).to.have.been.calledWith('mouseup', sinon.match.func);
            expect(removeListenerStub).to.have.been.calledWith('mouseenter', sinon.match.func);
            expect(removeListenerStub).to.have.been.calledWith('mouseleave', sinon.match.func);
        });
    });

    describe('keydownHandler()', () => {
        it('should hide the dialog when user presses Esc', () => {
            const hideStub = sandbox.stub(annotationDialog, 'hide');

            annotationDialog.keydownHandler({
                key: 'U+001B', // esc key
                stopPropagation: () => {}
            });

            expect(hideStub).to.have.been.calledWith(true);
        });

        it('should activate the reply area when user presses another key inside the reply area', () => {
            const activateReplyStub = sandbox.stub(annotationDialog, '_activateReply');

            annotationDialog.keydownHandler({
                key: ' ', // space
                target: annotationDialog._element.querySelector('.reply-textarea'),
                stopPropagation: () => {}
            });

            expect(activateReplyStub).to.have.been.called;
        });
    });

    describe('mouseupHandler()', () => {
        it('should stop propagation on the event', () => {
            const event = {
                stopPropagation: () => {}
            };
            const stopPropStub = sandbox.stub(event, 'stopPropagation');

            annotationDialog.mouseupHandler(event);

            expect(stopPropStub).to.have.been.called;
        });
    });

    describe('mouseenterHandler()', () => {
        it('should clear the hide timeout', () => {
            const clearTimeoutStub = sandbox.stub(window, 'clearTimeout');

            annotationDialog.mouseenterHandler();

            expect(clearTimeoutStub).to.have.been.called;
            expect(annotationDialog._timeoutHandler).to.be.null;
        });
    });

    describe('mouseleaveHandler()', () => {
        it('should not do anything if there are no annotations in the dialog', () => {
            const hideStub = sandbox.stub(annotationDialog, 'hide');

            annotationDialog.mouseleaveHandler();

            expect(hideStub).to.not.have.been.called;
        });

        it('should hide dialog if there are annotations in the dialog', () => {
            const hideStub = sandbox.stub(annotationDialog, 'hide');

            annotationDialog.addAnnotation({
                annotationID: 'someID',
                text: 'blah',
                user: {},
                permissions: {}
            });
            annotationDialog.mouseleaveHandler();

            expect(hideStub).to.have.been.called;
        });
    });

    describe('clickHandler()', () => {
        const event = {
            stopPropagation: () => {}
        };

        it('should post annotation when post annotation button is clicked', () => {
            sandbox.stub(annotatorUtil, 'findClosestDataType').returns('post-annotation-btn');
            const stub = sandbox.stub(annotationDialog, '_postAnnotation');

            annotationDialog.clickHandler(event);

            expect(stub).to.have.been.called;
        });

        it('should cancel annotation when cancel annotation button is clicked', () => {
            sandbox.stub(annotatorUtil, 'findClosestDataType').returns('cancel-annotation-btn');
            const stub = sandbox.stub(annotationDialog, '_cancelAnnotation');

            annotationDialog.clickHandler(event);

            expect(stub).to.have.been.called;
        });

        it('should activate reply area when textarea is clicked', () => {
            sandbox.stub(annotatorUtil, 'findClosestDataType').returns('reply-textarea');
            const stub = sandbox.stub(annotationDialog, '_activateReply');

            annotationDialog.clickHandler(event);

            expect(stub).to.have.been.called;
        });

        it('should deactivate reply area when cancel reply button is clicked', () => {
            sandbox.stub(annotatorUtil, 'findClosestDataType').returns('cancel-reply-btn');
            const stub = sandbox.stub(annotationDialog, '_deactivateReply');

            annotationDialog.clickHandler(event);

            expect(stub).to.have.been.called;
        });

        it('should post reply when post reply button is clicked', () => {
            sandbox.stub(annotatorUtil, 'findClosestDataType').returns('post-reply-btn');
            const stub = sandbox.stub(annotationDialog, '_postReply');

            annotationDialog.clickHandler(event);

            expect(stub).to.have.been.called;
        });

        it('should show delete confirmation when delete button is clicked', () => {
            const target = document.createElement('div');
            event.target = target;

            const findClosestStub = sandbox.stub(annotatorUtil, 'findClosestDataType');
            findClosestStub.onFirstCall().returns('delete-btn');
            findClosestStub.onSecondCall().returns('someID');
            const stub = sandbox.stub(annotationDialog, '_showDeleteConfirmation');

            annotationDialog.clickHandler(event);

            expect(stub).to.have.been.calledWith('someID');
        });

        it('should cancel deletion when cancel delete button is clicked', () => {
            const target = document.createElement('div');
            event.target = target;

            const findClosestStub = sandbox.stub(annotatorUtil, 'findClosestDataType');
            findClosestStub.onFirstCall().returns('cancel-delete-btn');
            findClosestStub.onSecondCall().returns('someID');
            const stub = sandbox.stub(annotationDialog, '_hideDeleteConfirmation');

            annotationDialog.clickHandler(event);

            expect(stub).to.have.been.calledWith('someID');
        });

        it('should confirm deletion when confirm delete button is clicked', () => {
            const target = document.createElement('div');
            event.target = target;

            const findClosestStub = sandbox.stub(annotatorUtil, 'findClosestDataType');
            findClosestStub.onFirstCall().returns('confirm-delete-btn');
            findClosestStub.onSecondCall().returns('someID');
            const stub = sandbox.stub(annotationDialog, '_deleteAnnotation');

            annotationDialog.clickHandler(event);

            expect(stub).to.have.been.calledWith('someID');
        });
    });
});
