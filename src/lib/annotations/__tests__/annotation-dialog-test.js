
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
        document.querySelector('.annotated-element').appendChild(annotationDialog._element);
    });

    afterEach(() => {
        const dialogEl = document.querySelector('.annotated-element');
        dialogEl.parentNode.removeChild(dialogEl);
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
        it('should hide dialog immediately', () => {
            annotationDialog.hide();

            expect(annotationDialog._element.classList.contains('box-preview-is-hidden')).to.be.true;
        });
    });

    describe('addAnnotation()', () => {
        it('should add annotation to the dialog and deactivate the reply area', () => {
            const addStub = sandbox.stub(annotationDialog, '_addAnnotationElement');
            const deactivateStub = sandbox.stub(annotationDialog, '_deactivateReply');
            annotationDialog.addAnnotation({});

            expect(addStub).to.have.been.called;
            expect(deactivateStub).to.have.been.calledWith(true);
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

            expect(hideStub).to.have.been.called;
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
        it('should show the element only if the element is currently hidden', () => {
            annotationDialog._element.classList.add('box-preview-is-hidden');
            sandbox.stub(annotatorUtil, 'showElement');
            annotationDialog.mouseenterHandler();
            expect(annotatorUtil.showElement).to.have.been.called;
        });

        it('should do nothing if the element is already shown', () => {
            sandbox.stub(annotatorUtil, 'showElement');
            annotationDialog.mouseenterHandler();
            expect(annotatorUtil.showElement).to.not.have.been.called;
        });

        it('should emit \'annotationcommentpending\' when user hovers back into a dialog that has a pending comment', () => {
            annotationDialog._element.classList.add('box-preview-is-hidden');
            sandbox.stub(annotatorUtil, 'showElement');
            sandbox.stub(annotationDialog, 'emit');
            const commentsTextArea = annotationDialog._element.querySelector(constants.SELECTOR_ANNOTATION_TEXTAREA);
            commentsTextArea.textContent = 'bleh';

            annotationDialog.mouseenterHandler();
            expect(annotatorUtil.showElement).to.have.been.called;
            expect(annotationDialog.emit).to.have.been.calledWith('annotationcommentpending');
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
            const cancelStub = sandbox.stub(annotationDialog, '_cancelAnnotation');
            const deactivateStub = sandbox.stub(annotationDialog, '_deactivateReply');

            annotationDialog.clickHandler(event);

            expect(cancelStub).to.have.been.called;
            expect(deactivateStub).to.have.been.calledWith(true);
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

            expect(stub).to.have.been.calledWith(true);
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

    describe('_addAnnotationElement()', () => {
        it('should not add a comment if the text is blank', () => {
            annotationDialog._addAnnotationElement({
                annotationID: 1,
                text: '',
                user: {},
                permissions: {}
            });
            const annotationComment = document.querySelector('.annotation-comment');

            expect(annotationComment).to.be.null;
        });

        it('should add an annotation comment if text is present', () => {
            annotationDialog._addAnnotationElement({
                annotationID: 1,
                text: 'the preview sdk is awesome!',
                user: {},
                permissions: {}
            });
            const annotationComment = document.querySelector('.comment-text');

            expect(annotationComment.innerHTML).to.equal('the preview sdk is awesome!');
        });

        it('should display the posting message if the user id is 0', () => {
            annotationDialog._addAnnotationElement({
                annotationID: 1,
                text: 'the preview sdk is awesome!',
                user: { id: 0 },
                permissions: {}
            });
            const username = document.querySelector('.user-name');

            expect(username.innerHTML).to.equal(__('annotation_posting_message'));
        });

        it('should display user name if the user id is not 0', () => {
            annotationDialog._addAnnotationElement({
                annotationID: 1,
                text: 'the preview sdk is awesome!',
                user: { id: 1, name: 'user' },
                permissions: {}
            });
            const username = document.querySelector('.user-name');

            expect(username.innerHTML).to.equal('user');
        });

        it('should hide the delete icon if the user does\'nt have delete permissions', () => {
            annotationDialog._addAnnotationElement({
                annotationID: 1,
                text: 'the preview sdk is amazing!',
                user: { id: 1, name: 'user' },
                permissions: { can_delete: false }
            });
            const deleteButton = document.querySelector('.delete-comment-btn');

            expect(deleteButton.classList.contains('box-preview-is-hidden')).to.be.true;
        });

        it('should make the delete icon hidden if the delete permission is not specified', () => {
            annotationDialog._addAnnotationElement({
                annotationID: 1,
                text: 'the preview sdk is amazing!',
                user: { id: 1, name: 'user' },
                permissions: {}
            });
            const deleteButton = document.querySelector('.delete-comment-btn');

            expect(deleteButton.classList.contains('box-preview-is-hidden')).to.be.true;
        });

        it('should make delete icon visible if the user has delete permission', () => {
            annotationDialog._addAnnotationElement({
                annotationID: 1,
                text: 'the preview sdk is amazing!',
                user: { id: 1, name: 'user' },
                permissions: { can_delete: true }
            });
            const deleteButton = document.querySelector('.delete-comment-btn');

            expect(deleteButton.classList.contains('box-preview-is-hidden')).to.be.false;
        });

        it('should hide the delete confirmation UI by default', () => {
            annotationDialog._addAnnotationElement({
                annotationID: 1,
                text: 'the preview sdk is amazing!',
                user: { id: 1, name: 'user' },
                permissions: { can_delete: true }
            });
            const deleteConfirmation = document.querySelector('.delete-confirmation');

            expect(deleteConfirmation.classList.contains('box-preview-is-hidden')).to.be.true;
        });
        it('should correctly format the date and time in a different locale', () => {
            const date = new Date();
            const toLocaleStringStub = sandbox.stub(Date.prototype, 'toLocaleString');
            annotationDialog._locale = 'en-GB';
            annotationDialog._addAnnotationElement({
                annotationID: 1,
                text: 'the preview sdk is amazing!',
                user: { id: 1, name: 'user' },
                permissions: { can_delete: true },
                created: date
            });


            expect(toLocaleStringStub).to.be.calledWith('en-GB');
        });
    });

    describe('_postAannotation()', () => {
        it('should not post an annotation to the dialog if it has no text', () => {
            const emitStub = sandbox.stub(annotationDialog, 'emit');

            annotationDialog._postAnnotation();
            expect(emitStub).to.not.be.called;
        });

        it('should post an annotation to the dialog if it has text', () => {
            const emitStub = sandbox.stub(annotationDialog, 'emit');

            document.querySelector('textarea').innerHTML += 'the preview SDK is great!';
            annotationDialog._postAnnotation();
            expect(emitStub).to.have.been.calledWith('annotationcreate', { text: 'the preview SDK is great!' });
        });

        it('should clear the annotation text element after posting', () => {
            const annotationTextEl = document.querySelector('textarea');

            annotationTextEl.innerHTML += 'the preview SDK is great!';
            annotationDialog._postAnnotation();
            expect(annotationTextEl.value).to.equal('');
        });
    });

    describe('_cancelAnnotation()', () => {
        it('should emit the annotationcancel message', () => {
            const emitStub = sandbox.stub(annotationDialog, 'emit');

            annotationDialog._cancelAnnotation();
            expect(emitStub).to.have.been.calledWith('annotationcancel');
        });
    });

    describe('_activateReply()', () => {
        it('should show the correct UI when the reply textarea is activated', () => {
            document.querySelector('textarea').innerHTML += 'the preview SDK is great!';
            annotationDialog._addAnnotationElement({
                annotationID: 1,
                text: 'the preview sdk is amazing!',
                user: { id: 1, name: 'user' },
                permissions: { can_delete: true }
            });
            const replyTextEl = document.querySelector(constants.SELECTOR_REPLY_TEXTAREA);
            const buttonContainer = replyTextEl.parentNode.querySelector(constants.SELECTOR_BUTTON_CONTAINER);

            annotationDialog._activateReply();
            expect(replyTextEl.classList.contains('box-preview-is-active')).to.be.true;
            expect(buttonContainer.classList.contains('box-preview-is-hidden')).to.be.false;
        });
    });

    describe('_deactivateReply()', () => {
        it('should show the correct UI when the reply textarea is deactivated', () => {
            annotationDialog._addAnnotationElement({
                annotationID: 1,
                text: 'the preview sdk is amazing!',
                user: { id: 1, name: 'user' },
                permissions: { can_delete: true }
            });
            const replyTextEl = document.querySelector(constants.SELECTOR_REPLY_TEXTAREA);
            const buttonContainer = replyTextEl.parentNode.querySelector(constants.SELECTOR_BUTTON_CONTAINER);

            annotationDialog._deactivateReply();
            expect(replyTextEl.classList.contains('box-preview-is-active')).to.be.false;
            expect(buttonContainer.classList.contains('box-preview-is-hidden')).to.be.true;
        });
    });

    describe('_postReply()', () => {
        it('should not post reply to the dialog if it has no text', () => {
            annotationDialog._addAnnotationElement({
                annotationID: 1,
                text: 'the preview sdk is amazing!',
                user: { id: 1, name: 'user' },
                permissions: { can_delete: true }
            });
            const emitStub = sandbox.stub(annotationDialog, 'emit');

            annotationDialog._activateReply();
            annotationDialog._postReply();
            expect(emitStub).to.not.be.called;
        });

        it('should post a reply to the dialog if it has text', () => {
            annotationDialog._addAnnotationElement({
                annotationID: 1,
                text: 'the preview sdk is amazing!',
                user: { id: 1, name: 'user' },
                permissions: { can_delete: true }
            });
            const emitStub = sandbox.stub(annotationDialog, 'emit');
            const replyTextEl = document.querySelector(constants.SELECTOR_REPLY_TEXTAREA);

            annotationDialog._activateReply();
            replyTextEl.innerHTML += 'the preview SDK is great!';
            annotationDialog._postReply();
            expect(emitStub).to.have.been.calledWith('annotationcreate', { text: 'the preview SDK is great!' });
        });

        it('should clear the reply text element after posting', () => {
            annotationDialog._addAnnotationElement({
                annotationID: 1,
                text: 'the preview sdk is amazing!',
                user: { id: 1, name: 'user' },
                permissions: { can_delete: true }
            });
            const replyTextEl = document.querySelector(constants.SELECTOR_REPLY_TEXTAREA);

            annotationDialog._activateReply();
            replyTextEl.innerHTML += 'the preview SDK is great!';
            annotationDialog._postReply();
            expect(replyTextEl.value).to.equal('');
        });
    });

    describe('_showDeleteConfirmation()', () => {
        it('should show the correct UI when a user clicks on delete', () => {
            annotationDialog._addAnnotationElement({
                annotationID: 1,
                text: 'the preview sdk is amazing!',
                user: { id: 1, name: 'user' },
                permissions: { can_delete: true }
            });
            const showElementStub = sandbox.stub(annotatorUtil, 'showElement');

            annotationDialog._showDeleteConfirmation(1);
            expect(showElementStub).to.be.called;
        });
    });

    describe('_hideDeleteConfirmation()', () => {
        it('should show the correct UI when a user clicks cancel in the delete confirmation', () => {
            annotationDialog._addAnnotationElement({
                annotationID: 1,
                text: 'the preview sdk is amazing!',
                user: { id: 1, name: 'user' },
                permissions: { can_delete: true }
            });
            const hideElementStub = sandbox.stub(annotatorUtil, 'hideElement');

            annotationDialog._showDeleteConfirmation(1);
            annotationDialog._hideDeleteConfirmation(1);
            expect(hideElementStub).to.be.called;
        });
    });

    describe('_deleteAnnotation()', () => {
        it('should emit the annotationdelete message', () => {
            annotationDialog._addAnnotationElement({
                annotationID: 1,
                text: 'the preview sdk is amazing!',
                user: { id: 1, name: 'user' },
                permissions: { can_delete: true }
            });
            const emitStub = sandbox.stub(annotationDialog, 'emit');

            annotationDialog._deleteAnnotation(1);
            expect(emitStub).to.have.been.calledWith('annotationdelete', { annotationID: 1 });
        });
    });
});
