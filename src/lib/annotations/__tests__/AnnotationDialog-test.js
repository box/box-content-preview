/* eslint-disable no-unused-expressions */
import Annotation from '../Annotation';
import AnnotationDialog from '../AnnotationDialog';
import * as annotatorUtil from '../annotatorUtil';
import * as constants from '../annotationConstants';
import { CLASS_ACTIVE, CLASS_HIDDEN } from '../../constants';

let dialog;
const sandbox = sinon.sandbox.create();
let stubs = {};

describe('lib/annotations/AnnotationDialog', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('annotations/__tests__/AnnotationDialog-test.html');

        dialog = new AnnotationDialog({
            annotatedElement: document.querySelector('.annotated-element'),
            location: {},
            annotations: [],
            canAnnotate: true
        });
        dialog.setup([]);
        document.querySelector('.annotated-element').appendChild(dialog._element);

        stubs.emit = sandbox.stub(dialog, 'emit');
    });

    afterEach(() => {
        const dialogEl = document.querySelector('.annotated-element');
        if (dialogEl && dialogEl.parentNode) {
            dialogEl.parentNode.removeChild(dialogEl);
        }

        sandbox.verifyAndRestore();
        if (typeof dialog.destroy === 'function') {
            dialog.destroy();
            dialog = null;
        }

        stubs = {};
    });

    describe('destroy()', () => {
        it('should unbind DOM listeners and cleanup its HTML', () => {
            const unbindStub = sandbox.stub(dialog, 'unbindDOMListeners');

            dialog.destroy();
            expect(unbindStub).to.be.called;
            expect(dialog._element).to.be.null;
        });
    });

    describe('show()', () => {
        beforeEach(() => {
            stubs.position = sandbox.stub(dialog, 'position');
        });

        it('should not re-show dialog if already shown on page', () => {
            dialog._hasAnnotations = true;
            dialog.activateReply();

            dialog.show();
            expect(stubs.position).to.not.be.called;
        });

        it('should not re-position dialog if already shown on page', () => {
            dialog._hasAnnotations = true;

            // Deactivates dialog textarea
            dialog.deactivateReply();
            const commentsTextArea = dialog._element.querySelector(constants.SELECTOR_ANNOTATION_TEXTAREA);
            commentsTextArea.classList.remove('bp-is-active');

            // Removes dialog from page
            dialog._element.parentNode.removeChild(dialog._element);
            dialog.activateReply();

            dialog.show();
            expect(stubs.position).to.be.called;
        });

        it('should position the dialog', () => {
            dialog._hasAnnotations = true;
            dialog.deactivateReply();
            const commentsTextArea = dialog._element.querySelector(constants.SELECTOR_ANNOTATION_TEXTAREA);
            commentsTextArea.classList.remove('bp-is-active');

            dialog.show();
            expect(stubs.position).to.be.called;
        });

        it('should hide the reply/edit/delete UI if user cannot annotate', () => {
            dialog._canAnnotate = false;
            dialog._hasAnnotations = true;
            dialog.deactivateReply();

            dialog.show();
            expect(dialog._element).to.have.class(constants.CLASS_CANNOT_ANNOTATE);
        });

        it('should focus textarea if in viewport', () => {
            dialog._canAnnotate = false;
            dialog._hasAnnotations = true;
            dialog.deactivateReply();
            sandbox.stub(annotatorUtil, 'isElementInViewport').returns(true);

            dialog.show();
            expect(document.activeElement).to.have.class('reply-textarea');
        });

        it('should activate reply textarea if dialog has annotations', () => {
            dialog._canAnnotate = false;
            dialog._hasAnnotations = true;
            dialog.deactivateReply();
            sandbox.stub(dialog, 'activateReply');

            dialog.show();
            const textArea = dialog._element.querySelector(constants.SELECTOR_REPLY_TEXTAREA);
            expect(textArea).to.not.have.class(CLASS_ACTIVE);
            expect(dialog.activateReply).to.be.called;
        });

        it('should activate textarea if dialog does not have annotations', () => {
            dialog._canAnnotate = false;
            dialog._hasAnnotations = false;
            dialog.deactivateReply();
            sandbox.stub(dialog, 'activateReply');

            dialog.show();
            const textArea = dialog._element.querySelector(constants.SELECTOR_ANNOTATION_TEXTAREA);
            expect(textArea).to.have.class(CLASS_ACTIVE);
            expect(dialog.activateReply).to.not.be.called;
        });
    });

    describe('hide()', () => {
        it('should hide dialog immediately', () => {
            dialog.hide();
            expect(dialog._element).to.have.class(CLASS_HIDDEN);
        });
    });

    describe('addAnnotation()', () => {
        beforeEach(() => {
            stubs.addEl = sandbox.stub(dialog, 'addAnnotationElement');
            stubs.deactivate = sandbox.stub(dialog, 'deactivateReply');
        });

        it('should add annotation to the dialog and deactivate the reply area', () => {
            dialog.addAnnotation(new Annotation({}));
            expect(stubs.addEl).to.be.called;
            expect(stubs.deactivate).to.be.calledWith(true);
        });

        it('should hide the create section and show the show section if there are no annotations', () => {
            // Add dialog to DOM
            dialog._annotatedElement.appendChild(dialog._element);

            dialog.addAnnotation(new Annotation({}));
            const createSectionEl = document.querySelector('[data-section="create"]');
            const showSectionEl = document.querySelector('[data-section="show"]');
            expect(createSectionEl).to.have.class(CLASS_HIDDEN);
            expect(showSectionEl).to.not.have.class(CLASS_HIDDEN);
        });
    });

    describe('removeAnnotation()', () => {
        it('should remove annotation element and deactivate reply', () => {
            stubs.deactivate = sandbox.stub(dialog, 'deactivateReply');

            dialog.addAnnotation(new Annotation({
                annotationID: 'someID',
                text: 'blah',
                user: {},
                permissions: {}
            }));

            dialog.removeAnnotation('someID');
            const annotationEl = dialog._element.querySelector('[data-annotation-id="someID"]');
            expect(annotationEl).to.be.null;
            expect(stubs.deactivate).to.be.called;
        });

        it('should not do anything if the specified annotation does not exist', () => {
            stubs.deactivate = sandbox.stub(dialog, 'deactivateReply');

            dialog.removeAnnotation('someID');
            expect(stubs.deactivate).to.not.be.called;
        });
    });

    describe('element()', () => {
        it('should return dialog element', () => {
            expect(dialog.element).to.equal(dialog._element);
        });
    });

    describe('setup()', () => {
        it('should set up HTML element, add annotations to the dialog, and bind DOM listeners', () => {
            stubs.bind = sandbox.stub(dialog, 'bindDOMListeners');

            const annotationData = new Annotation({
                annotationID: 'someID',
                text: 'blah',
                user: {},
                permissions: {},
                thread: 1
            });

            dialog.setup([annotationData]);
            expect(dialog._element).to.not.be.null;
            expect(dialog._element.querySelector(['[data-annotation-id="someID"]'])).to.not.be.null;
            expect(dialog._element.dataset.threadNumber).to.equal('1');
            expect(stubs.bind).to.be.called;
        });

        it('should not set thread number if there are no annotations in the thread', () => {
            dialog.setup([]);
            expect(dialog._element.dataset.threadNumber).to.be.undefined;
        });
    });

    describe('bindDOMListeners()', () => {
        it('should bind DOM listeners', () => {
            stubs.add = sandbox.stub(dialog._element, 'addEventListener');

            dialog.bindDOMListeners();
            expect(stubs.add).to.be.calledWith('keydown', sinon.match.func);
            expect(stubs.add).to.be.calledWith('click', sinon.match.func);
            expect(stubs.add).to.be.calledWith('mouseup', sinon.match.func);
            expect(stubs.add).to.be.calledWith('mouseenter', sinon.match.func);
            expect(stubs.add).to.be.calledWith('mouseleave', sinon.match.func);
            expect(stubs.add).to.be.calledWith('wheel', sinon.match.func);
        });
    });

    describe('unbindDOMListeners()', () => {
        it('should unbind DOM listeners', () => {
            stubs.remove = sandbox.stub(dialog._element, 'removeEventListener');

            dialog.unbindDOMListeners();
            expect(stubs.remove).to.be.calledWith('keydown', sinon.match.func);
            expect(stubs.remove).to.be.calledWith('click', sinon.match.func);
            expect(stubs.remove).to.be.calledWith('mouseup', sinon.match.func);
            expect(stubs.remove).to.be.calledWith('mouseenter', sinon.match.func);
            expect(stubs.remove).to.be.calledWith('mouseleave', sinon.match.func);
            expect(stubs.remove).to.be.calledWith('wheel', sinon.match.func);
        });
    });

    describe('keydownHandler()', () => {
        it('should hide the dialog when user presses Esc', () => {
            stubs.hide = sandbox.stub(dialog, 'hide');

            dialog.keydownHandler({
                key: 'U+001B', // esc key
                stopPropagation: () => {}
            });
            expect(stubs.hide).to.be.called;
        });

        it('should activate the reply area when user presses another key inside the reply area', () => {
            stubs.activate = sandbox.stub(dialog, 'activateReply');

            dialog.keydownHandler({
                key: ' ', // space
                target: dialog._element.querySelector('.reply-textarea'),
                stopPropagation: () => {}
            });
            expect(stubs.activate).to.be.called;
        });
    });

    describe('stopPropagation()', () => {
        it('should stop propagation on the event', () => {
            const event = {
                stopPropagation: () => {}
            };
            stubs.stop = sandbox.stub(event, 'stopPropagation');

            dialog.stopPropagation(event);
            expect(stubs.stop).to.be.called;
        });
    });

    describe('mouseenterHandler()', () => {
        beforeEach(() => {
            stubs.show = sandbox.stub(annotatorUtil, 'showElement');
        });

        it('should show the element only if the element is currently hidden', () => {
            dialog._element.classList.add(CLASS_HIDDEN);

            dialog.mouseenterHandler();
            expect(annotatorUtil.showElement).to.be.called;
        });

        it('should do nothing if the element is already shown', () => {
            dialog.mouseenterHandler();
            expect(annotatorUtil.showElement).to.not.be.called;
        });

        it('should emit \'annotationcommentpending\' when user hovers back into a dialog that has a pending comment', () => {
            dialog._element.classList.add(CLASS_HIDDEN);
            const commentsTextArea = dialog._element.querySelector(constants.SELECTOR_ANNOTATION_TEXTAREA);
            commentsTextArea.textContent = 'bleh';

            dialog.mouseenterHandler();
            expect(stubs.show).to.be.called;
            expect(stubs.emit).to.be.calledWith('annotationcommentpending');
        });
    });

    describe('mouseleaveHandler()', () => {
        it('should not do anything if there are no annotations in the dialog', () => {
            stubs.hide = sandbox.stub(dialog, 'hide');

            dialog.mouseleaveHandler();
            expect(stubs.hide).to.not.be.called;
        });

        it('should hide dialog if there are annotations in the dialog', () => {
            stubs.hide = sandbox.stub(dialog, 'hide');

            dialog.addAnnotation(new Annotation({
                annotationID: 'someID',
                text: 'blah',
                user: {},
                permissions: {}
            }));

            dialog.mouseleaveHandler();
            expect(stubs.hide).to.be.called;
        });
    });

    describe('clickHandler()', () => {
        beforeEach(() => {
            stubs.event = {
                stopPropagation: () => {},
                target: document.createElement('div')
            };
            stubs.post = sandbox.stub(dialog, 'postAnnotation');
            stubs.cancel = sandbox.stub(dialog, 'cancelAnnotation');
            stubs.deactivate = sandbox.stub(dialog, 'deactivateReply');
            stubs.activate = sandbox.stub(dialog, 'activateReply');
            stubs.findClosest = sandbox.stub(annotatorUtil, 'findClosestDataType');
            stubs.showDelete = sandbox.stub(dialog, 'showDeleteConfirmation');
            stubs.hideDelete = sandbox.stub(dialog, 'hideDeleteConfirmation');
            stubs.delete = sandbox.stub(dialog, 'deleteAnnotation');
            stubs.reply = sandbox.stub(dialog, 'postReply');
        });

        it('should post annotation when post annotation button is clicked', () => {
            stubs.findClosest.returns('post-annotation-btn');

            dialog.clickHandler(stubs.event);
            expect(stubs.post).to.be.called;
        });

        it('should cancel annotation when cancel annotation button is clicked', () => {
            stubs.findClosest.returns('cancel-annotation-btn');

            dialog.clickHandler(stubs.event);
            expect(stubs.cancel).to.be.called;
            expect(stubs.deactivate).to.be.calledWith(true);
        });

        it('should activate reply area when textarea is clicked', () => {
            stubs.findClosest.returns('reply-textarea');

            dialog.clickHandler(stubs.event);
            expect(stubs.activate).to.be.called;
        });

        it('should deactivate reply area when cancel reply button is clicked', () => {
            stubs.findClosest.returns('cancel-reply-btn');

            dialog.clickHandler(stubs.event);
            expect(stubs.deactivate).to.be.calledWith(true);
        });

        it('should post reply when post reply button is clicked', () => {
            stubs.findClosest.returns('post-reply-btn');

            dialog.clickHandler(stubs.event);
            expect(stubs.reply).to.be.called;
        });

        it('should show delete confirmation when delete button is clicked', () => {
            stubs.findClosest.onFirstCall().returns('delete-btn');
            stubs.findClosest.onSecondCall().returns('someID');

            dialog.clickHandler(stubs.event);
            expect(stubs.showDelete).to.be.calledWith('someID');
        });

        it('should cancel deletion when cancel delete button is clicked', () => {
            stubs.findClosest.onFirstCall().returns('cancel-delete-btn');
            stubs.findClosest.onSecondCall().returns('someID');

            dialog.clickHandler(stubs.event);
            expect(stubs.hideDelete).to.be.calledWith('someID');
        });

        it('should confirm deletion when confirm delete button is clicked', () => {
            stubs.findClosest.onFirstCall().returns('confirm-delete-btn');
            stubs.findClosest.onSecondCall().returns('someID');

            dialog.clickHandler(stubs.event);
            expect(stubs.delete).to.be.calledWith('someID');
        });

        it('should do nothing if dataType does not match any button in the annotation dialog', () => {
            stubs.findClosest.returns(null);

            dialog.clickHandler(stubs.event);
            expect(stubs.post).to.not.be.called;
            expect(stubs.reply).to.not.be.called;
            expect(stubs.cancel).to.not.be.called;
            expect(stubs.deactivate).to.not.be.called;
            expect(stubs.activate).to.not.be.called;
            expect(stubs.reply).to.not.be.called;
            expect(stubs.showDelete).to.not.be.called;
            expect(stubs.hideDelete).to.not.be.called;
            expect(stubs.delete).to.not.be.called;
        });
    });

    describe('addAnnotationElement()', () => {
        it('should add an annotation comment if text is present', () => {
            dialog.addAnnotationElement(new Annotation({
                annotationID: 1,
                text: 'the preview sdk is awesome!',
                user: {},
                permissions: {}
            }));
            const annotationComment = document.querySelector('.comment-text');
            expect(annotationComment).to.contain.html('the preview sdk is awesome!');
        });

        it('should display the posting message if the user id is 0', () => {
            dialog.addAnnotationElement(new Annotation({
                annotationID: 1,
                text: 'the preview sdk is awesome!',
                user: { id: 0 },
                permissions: {}
            }));
            const username = document.querySelector('.user-name');
            expect(username).to.contain.html(__('annotation_posting_message'));
        });

        it('should display user name if the user id is not 0', () => {
            dialog.addAnnotationElement(new Annotation({
                annotationID: 1,
                text: 'the preview sdk is awesome!',
                user: { id: 1, name: 'user' },
                permissions: {}
            }));
            const username = document.querySelector('.user-name');
            expect(username).to.contain.html('user');
        });

        it('should hide the delete icon if the user does\'nt have delete permissions', () => {
            dialog.addAnnotationElement(new Annotation({
                annotationID: 1,
                text: 'the preview sdk is amazing!',
                user: { id: 1, name: 'user' },
                permissions: { can_delete: false }
            }));
            const deleteButton = document.querySelector('.delete-comment-btn');
            expect(deleteButton).to.have.class(CLASS_HIDDEN);
        });

        it('should make the delete icon hidden if the delete permission is not specified', () => {
            dialog.addAnnotationElement(new Annotation({
                annotationID: 1,
                text: 'the preview sdk is amazing!',
                user: { id: 1, name: 'user' },
                permissions: {}
            }));
            const deleteButton = document.querySelector('.delete-comment-btn');
            expect(deleteButton).to.have.class(CLASS_HIDDEN);
        });

        it('should make delete icon visible if the user has delete permission', () => {
            dialog.addAnnotationElement(new Annotation({
                annotationID: 1,
                text: 'the preview sdk is amazing!',
                user: { id: 1, name: 'user' },
                permissions: { can_delete: true }
            }));
            const deleteButton = document.querySelector('.delete-comment-btn');
            expect(deleteButton).to.not.have.class(CLASS_HIDDEN);
        });

        it('should hide the delete confirmation UI by default', () => {
            dialog.addAnnotationElement(new Annotation({
                annotationID: 1,
                text: 'the preview sdk is amazing!',
                user: { id: 1, name: 'user' },
                permissions: { can_delete: true }
            }));
            const deleteConfirmation = document.querySelector('.delete-confirmation');
            expect(deleteConfirmation).to.have.class(CLASS_HIDDEN);
        });

        it('should correctly format the date and time in a different locale', () => {
            const date = new Date();
            stubs.locale = sandbox.stub(Date.prototype, 'toLocaleString');
            dialog._locale = 'en-GB';

            dialog.addAnnotationElement(new Annotation({
                annotationID: 1,
                text: 'the preview sdk is amazing!',
                user: { id: 1, name: 'user' },
                permissions: { can_delete: true },
                created: date
            }));
            expect(stubs.locale).to.be.calledWith('en-GB');
        });
    });

    describe('_postAannotation()', () => {
        it('should not post an annotation to the dialog if it has no text', () => {
            dialog.postAnnotation();
            expect(stubs.emit).to.not.be.called;
        });

        it('should post an annotation to the dialog if it has text', () => {
            document.querySelector('textarea').innerHTML += 'the preview SDK is great!';

            dialog.postAnnotation();
            expect(stubs.emit).to.be.calledWith('annotationcreate', { text: 'the preview SDK is great!' });
        });

        it('should clear the annotation text element after posting', () => {
            const annotationTextEl = document.querySelector('textarea');
            annotationTextEl.innerHTML += 'the preview SDK is great!';

            dialog.postAnnotation();
            expect(annotationTextEl).to.have.value('');
        });
    });

    describe('cancelAnnotation()', () => {
        it('should emit the annotationcancel message', () => {
            dialog.cancelAnnotation();
            expect(stubs.emit).to.be.calledWith('annotationcancel');
        });
    });

    describe('activateReply()', () => {
        it('should do nothing if reply textarea is already active', () => {
            const replyTextEl = dialog._element.querySelector(constants.SELECTOR_REPLY_TEXTAREA);
            replyTextEl.classList.add('bp-is-active');
            sandbox.stub(annotatorUtil, 'showElement');

            dialog.activateReply();
            expect(annotatorUtil.showElement).to.not.be.called;
        });

        it('should show the correct UI when the reply textarea is activated', () => {
            document.querySelector('textarea').innerHTML += 'the preview SDK is great!';
            dialog.addAnnotationElement({
                annotationID: 1,
                text: 'the preview sdk is amazing!',
                user: { id: 1, name: 'user' },
                permissions: { can_delete: true }
            });
            const replyTextEl = document.querySelector(constants.SELECTOR_REPLY_TEXTAREA);
            const buttonContainer = replyTextEl.parentNode.querySelector(constants.SELECTOR_BUTTON_CONTAINER);

            dialog.activateReply();
            expect(replyTextEl).to.have.class(CLASS_ACTIVE);
            expect(buttonContainer).to.not.have.class(CLASS_HIDDEN);
        });
    });

    describe('deactivateReply()', () => {
        it('should do nothing if element does not exist', () => {
            dialog._element = null;
            sandbox.stub(annotatorUtil, 'resetTextarea');

            dialog.deactivateReply();
            expect(annotatorUtil.resetTextarea).to.not.be.called;
        });

        it('should show the correct UI when the reply textarea is deactivated', () => {
            dialog.addAnnotationElement(new Annotation({
                annotationID: 1,
                text: 'the preview sdk is amazing!',
                user: { id: 1, name: 'user' },
                permissions: { can_delete: true }
            }));
            const replyTextEl = document.querySelector(constants.SELECTOR_REPLY_TEXTAREA);
            const buttonContainer = replyTextEl.parentNode.querySelector(constants.SELECTOR_BUTTON_CONTAINER);

            dialog.deactivateReply();
            expect(replyTextEl).to.not.have.class(CLASS_ACTIVE);
            expect(buttonContainer).to.have.class(CLASS_HIDDEN);
        });
    });

    describe('postReply()', () => {
        it('should not post reply to the dialog if it has no text', () => {
            dialog.addAnnotationElement(new Annotation({
                annotationID: 1,
                text: 'the preview sdk is amazing!',
                user: { id: 1, name: 'user' },
                permissions: { can_delete: true }
            }));
            dialog.activateReply();

            dialog.postReply();
            expect(stubs.emit).to.not.be.called;
        });

        it('should post a reply to the dialog if it has text', () => {
            dialog.addAnnotationElement(new Annotation({
                annotationID: 1,
                text: 'the preview sdk is amazing!',
                user: { id: 1, name: 'user' },
                permissions: { can_delete: true }
            }));
            const replyTextEl = document.querySelector(constants.SELECTOR_REPLY_TEXTAREA);
            dialog.activateReply();
            replyTextEl.innerHTML += 'the preview SDK is great!';

            dialog.postReply();
            expect(stubs.emit).to.be.calledWith('annotationcreate', { text: 'the preview SDK is great!' });
        });

        it('should clear the reply text element after posting', () => {
            dialog.addAnnotationElement(new Annotation({
                annotationID: 1,
                text: 'the preview sdk is amazing!',
                user: { id: 1, name: 'user' },
                permissions: { can_delete: true }
            }));
            const replyTextEl = document.querySelector(constants.SELECTOR_REPLY_TEXTAREA);
            dialog.activateReply();
            replyTextEl.innerHTML += 'the preview SDK is great!';

            dialog.postReply();
            expect(replyTextEl).to.have.value('');
        });
    });

    describe('showDeleteConfirmation()', () => {
        it('should show the correct UI when a user clicks on delete', () => {
            dialog.addAnnotationElement(new Annotation({
                annotationID: 1,
                text: 'the preview sdk is amazing!',
                user: { id: 1, name: 'user' },
                permissions: { can_delete: true }
            }));
            const showElementStub = sandbox.stub(annotatorUtil, 'showElement');

            dialog.showDeleteConfirmation(1);
            expect(showElementStub).to.be.called;
        });
    });

    describe('hideDeleteConfirmation()', () => {
        it('should show the correct UI when a user clicks cancel in the delete confirmation', () => {
            dialog.addAnnotationElement(new Annotation({
                annotationID: 1,
                text: 'the preview sdk is amazing!',
                user: { id: 1, name: 'user' },
                permissions: { can_delete: true }
            }));
            const hideElementStub = sandbox.stub(annotatorUtil, 'hideElement');
            dialog.showDeleteConfirmation(1);

            dialog.hideDeleteConfirmation(1);
            expect(hideElementStub).to.be.called;
        });
    });

    describe('deleteAnnotation()', () => {
        it('should emit the annotationdelete message', () => {
            dialog.addAnnotationElement(new Annotation({
                annotationID: 1,
                text: 'the preview sdk is amazing!',
                user: { id: 1, name: 'user' },
                permissions: { can_delete: true }
            }));

            dialog.deleteAnnotation(1);
            expect(stubs.emit).to.be.calledWith('annotationdelete', { annotationID: 1 });
        });
    });
});
