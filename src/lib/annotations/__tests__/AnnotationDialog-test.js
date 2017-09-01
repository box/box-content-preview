/* eslint-disable no-unused-expressions */
import Annotation from '../Annotation';
import AnnotationDialog from '../AnnotationDialog';
import * as annotatorUtil from '../annotatorUtil';
import * as constants from '../annotationConstants';

const CLASS_FLIPPED_DIALOG = 'bp-annotation-dialog-flipped';
const CLASS_CANCEL_DELETE = 'cancel-delete-btn';
const CLASS_CANNOT_ANNOTATE = 'cannot-annotate';
const CLASS_REPLY_TEXTAREA = 'reply-textarea';
const CLASS_ANIMATE_DIALOG = 'bp-animate-show-dialog';
const CLASS_BUTTON_DELETE_COMMENT = 'delete-comment-btn';
const SELECTOR_DELETE_CONFIRMATION = '.delete-confirmation';

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
            container: document,
            location: {},
            annotations: [],
            canAnnotate: true
        });
        dialog.setup([]);
        document.querySelector('.annotated-element').appendChild(dialog.element);

        stubs.emit = sandbox.stub(dialog, 'emit');
        dialog.isMobile = false;
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
            expect(dialog.element).to.be.null;
        });
    });

    describe('show()', () => {
        beforeEach(() => {
            stubs.position = sandbox.stub(dialog, 'position');
        });

        it('should not re-show dialog if already shown on page', () => {
            dialog.hasAnnotations = true;
            dialog.activateReply();

            dialog.show();
            expect(stubs.position).to.not.be.called;
        });

        it('should not re-position dialog if already shown on page', () => {
            dialog.hasAnnotations = true;

            // Deactivates dialog textarea
            dialog.deactivateReply();
            const commentsTextArea = dialog.element.querySelector(constants.SELECTOR_ANNOTATION_TEXTAREA);
            commentsTextArea.classList.remove('bp-is-active');

            // Removes dialog from page
            dialog.element.parentNode.removeChild(dialog.element);
            dialog.activateReply();

            dialog.show();
            expect(stubs.position).to.be.called;
        });

        it('should position the dialog', () => {
            dialog.hasAnnotations = true;
            dialog.deactivateReply();
            const commentsTextArea = dialog.element.querySelector(constants.SELECTOR_ANNOTATION_TEXTAREA);
            commentsTextArea.classList.remove('bp-is-active');

            dialog.show();
            expect(stubs.position).to.be.called;
        });

        it('should hide the reply/edit/delete UI if user cannot annotate', () => {
            dialog.canAnnotate = false;
            dialog.hasAnnotations = true;
            dialog.deactivateReply();

            dialog.show();
            expect(dialog.element).to.have.class(CLASS_CANNOT_ANNOTATE);
        });

        it('should focus textarea if in viewport', () => {
            dialog.canAnnotate = false;
            dialog.hasAnnotations = true;
            dialog.deactivateReply();
            sandbox.stub(annotatorUtil, 'isElementInViewport').returns(true);

            dialog.show();
            expect(document.activeElement).to.have.class(CLASS_REPLY_TEXTAREA);
        });

        it('should activate reply textarea if dialog has annotations', () => {
            dialog.canAnnotate = false;
            dialog.hasAnnotations = true;
            dialog.deactivateReply();
            sandbox.stub(dialog, 'activateReply');

            dialog.show();
            const textArea = dialog.element.querySelector(`.${CLASS_REPLY_TEXTAREA}`);
            expect(textArea).to.not.have.class(constants.CLASS_ACTIVE);
            expect(dialog.activateReply).to.be.called;
        });

        it('should activate textarea if dialog does not have annotations', () => {
            dialog.canAnnotate = false;
            dialog.hasAnnotations = false;
            dialog.deactivateReply();
            sandbox.stub(dialog, 'activateReply');

            dialog.show();
            const textArea = dialog.element.querySelector(constants.SELECTOR_ANNOTATION_TEXTAREA);
            expect(textArea).to.have.class(constants.CLASS_ACTIVE);
            expect(dialog.activateReply).to.not.be.called;
        });

        it('should populate the mobile dialog if using a mobile browser', () => {
            dialog.isMobile = true;
            dialog.highlightDialogEl = null;
            stubs.show = sandbox.stub(annotatorUtil, 'showElement');
            stubs.bind = sandbox.stub(dialog, 'bindDOMListeners');

            dialog.show();
            expect(stubs.show).to.be.calledWith(dialog.element);
            expect(stubs.bind).to.be.called;
            expect(dialog.position).to.not.be.called;
            expect(dialog.element.classList.contains(CLASS_ANIMATE_DIALOG)).to.be.true;
        });

        it('should add the animation class to the the mobile dialog if using a mobile browser', () => {
            dialog.isMobile = true;

            dialog.show();
            expect(dialog.element.classList.contains(CLASS_ANIMATE_DIALOG)).to.be.true;
        });

        it('should reset the annotation dialog to be a plain highlight if no comments are present', () => {
            dialog.isMobile = true;
            dialog.highlightDialogEl = {};
            sandbox.stub(dialog.element, 'querySelectorAll').withArgs('.annotation-comment').returns([]);
            stubs.show = sandbox.stub(annotatorUtil, 'showElement');
            stubs.bind = sandbox.stub(dialog, 'bindDOMListeners');
            dialog.show();

            expect(dialog.element.classList.contains(constants.CLASS_ANNOTATION_PLAIN_HIGHLIGHT)).to.be.true;
        });
    });

    describe('hideMobileDialog()', () => {
        it('should do nothing if the dialog element does not exist', () => {
            dialog.element = null;
            stubs.hide = sandbox.stub(annotatorUtil, 'hideElement');
            dialog.hideMobileDialog();
            expect(stubs.hide).to.not.be.called;
        });

        it('should hide and reset the mobile annotations dialog', () => {
            dialog.element = document.querySelector(constants.SELECTOR_MOBILE_ANNOTATION_DIALOG);
            stubs.hide = sandbox.stub(annotatorUtil, 'hideElement');
            stubs.unbind = sandbox.stub(dialog, 'unbindDOMListeners');
            stubs.cancel = sandbox.stub(dialog, 'cancelAnnotation');
            dialog.hasAnnotations = true;

            dialog.hideMobileDialog();
            expect(stubs.hide).to.be.called;
            expect(stubs.unbind).to.be.called;
            expect(stubs.cancel).to.be.called;
            expect(dialog.element.classList.contains(CLASS_ANIMATE_DIALOG)).to.be.false;
        });

        it('should remove the animation class', () => {
            dialog.element = document.querySelector(constants.SELECTOR_MOBILE_ANNOTATION_DIALOG);
            dialog.hideMobileDialog();
            expect(dialog.element.classList.contains(CLASS_ANIMATE_DIALOG)).to.be.false;
        });

        it('should cancel unsaved annotations only if the dialog does not have annotations', () => {
            dialog.element = document.querySelector(constants.SELECTOR_MOBILE_ANNOTATION_DIALOG);
            stubs.cancel = sandbox.stub(dialog, 'cancelAnnotation');
            dialog.hasAnnotations = false;

            dialog.hideMobileDialog();
            expect(stubs.cancel).to.be.called;
        });
    });

    describe('hide()', () => {
        it('should do nothing if element is already hidden', () => {
            dialog.element.classList.add(constants.CLASS_HIDDEN);
            sandbox.stub(annotatorUtil, 'hideElement');
            dialog.hide();
            expect(annotatorUtil.hideElement).to.not.have.called;
        });

        it('should hide dialog immediately', () => {
            sandbox.stub(dialog, 'toggleFlippedThreadEl');
            dialog.hide();
            expect(dialog.element).to.have.class(constants.CLASS_HIDDEN);
            expect(dialog.toggleFlippedThreadEl).to.be.called;
        });

        it('should hide the mobile dialog if using a mobile browser', () => {
            dialog.isMobile = true;
            sandbox.stub(dialog, 'hideMobileDialog');
            dialog.hide();
            expect(dialog.hideMobileDialog).to.be.called;
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
            dialog.annotatedElement.appendChild(dialog.element);

            dialog.addAnnotation(new Annotation({}));
            const createSectionEl = document.querySelector(constants.SECTION_CREATE);
            const showSectionEl = document.querySelector(constants.SECTION_SHOW);
            expect(createSectionEl).to.have.class(constants.CLASS_HIDDEN);
            expect(showSectionEl).to.not.have.class(constants.CLASS_HIDDEN);
        });
    });

    describe('removeAnnotation()', () => {
        it('should remove annotation element and deactivate reply', () => {
            stubs.deactivate = sandbox.stub(dialog, 'deactivateReply');

            dialog.addAnnotation(
                new Annotation({
                    annotationID: 'someID',
                    text: 'blah',
                    user: {},
                    permissions: {}
                })
            );

            dialog.removeAnnotation('someID');
            const annotationEl = dialog.element.querySelector('[data-annotation-id="someID"]');
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
            expect(dialog.element).to.equal(dialog.element);
        });
    });

    describe('setup()', () => {
        beforeEach(() => {
            const dialogEl = document.createElement('div');
            sandbox.stub(dialog, 'generateDialogEl').returns(dialogEl);
            stubs.bind = sandbox.stub(dialog, 'bindDOMListeners');
            stubs.add = sandbox.stub(dialog, 'addAnnotationElement');

            stubs.annotation = new Annotation({
                annotationID: 'someID',
                text: 'blah',
                user: {},
                permissions: {},
                threadNumber: 1
            });

            dialog.isMobile = false;
        });

        it('should set up HTML element, add annotations to the dialog, and bind DOM listeners', () => {
            dialog.setup([stubs.annotation], {});
            expect(dialog.element).to.not.be.null;
            expect(dialog.element.dataset.threadNumber).to.equal('1');
            expect(stubs.bind).to.be.called;
            expect(dialog.threadEl).not.be.null;
        });

        it('should not set thread number if there are no annotations in the thread', () => {
            dialog.setup([], {});
            expect(dialog.element.dataset.threadNumber).to.be.undefined;
        });

        it('should not create dialog element if using a mobile browser', () => {
            dialog.isMobile = true;
            dialog.setup([stubs.annotation, stubs.annotation], {});
            expect(stubs.bind).to.not.be.called;
            expect(stubs.add).to.be.calledTwice;
        });
    });

    describe('bindDOMListeners()', () => {
        it('should bind DOM listeners', () => {
            stubs.add = sandbox.stub(dialog.element, 'addEventListener');

            dialog.bindDOMListeners();
            expect(stubs.add).to.be.calledWith('keydown', sinon.match.func);
            expect(stubs.add).to.be.calledWith('click', sinon.match.func);
            expect(stubs.add).to.be.calledWith('mouseup', sinon.match.func);
            expect(stubs.add).to.be.calledWith('mouseenter', sinon.match.func);
            expect(stubs.add).to.be.calledWith('mouseleave', sinon.match.func);
            expect(stubs.add).to.be.calledWith('wheel', sinon.match.func);
        });

        it('should not bind mouseenter/leave events for mobile browsers', () => {
            stubs.add = sandbox.stub(dialog.element, 'addEventListener');
            dialog.isMobile = true;

            dialog.bindDOMListeners();
            expect(stubs.add).to.be.calledWith('keydown', sinon.match.func);
            expect(stubs.add).to.be.calledWith('click', sinon.match.func);
            expect(stubs.add).to.be.calledWith('mouseup', sinon.match.func);
            expect(stubs.add).to.not.be.calledWith('mouseenter', sinon.match.func);
            expect(stubs.add).to.not.be.calledWith('mouseleave', sinon.match.func);
            expect(stubs.add).to.be.calledWith('wheel', sinon.match.func);
        });
    });

    describe('unbindDOMListeners()', () => {
        it('should unbind DOM listeners', () => {
            stubs.remove = sandbox.stub(dialog.element, 'removeEventListener');

            dialog.unbindDOMListeners();
            expect(stubs.remove).to.be.calledWith('keydown', sinon.match.func);
            expect(stubs.remove).to.be.calledWith('click', sinon.match.func);
            expect(stubs.remove).to.be.calledWith('mouseup', sinon.match.func);
            expect(stubs.remove).to.be.calledWith('mouseenter', sinon.match.func);
            expect(stubs.remove).to.be.calledWith('mouseleave', sinon.match.func);
            expect(stubs.remove).to.be.calledWith('wheel', sinon.match.func);
        });

        it('should not bind mouseenter/leave events for mobile browsers', () => {
            stubs.remove = sandbox.stub(dialog.element, 'removeEventListener');
            dialog.isMobile = true;

            dialog.unbindDOMListeners();
            expect(stubs.remove).to.be.calledWith('keydown', sinon.match.func);
            expect(stubs.remove).to.be.calledWith('click', sinon.match.func);
            expect(stubs.remove).to.be.calledWith('mouseup', sinon.match.func);
            expect(stubs.remove).to.not.be.calledWith('mouseenter', sinon.match.func);
            expect(stubs.remove).to.not.be.calledWith('mouseleave', sinon.match.func);
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
                target: dialog.element.querySelector(`.${CLASS_REPLY_TEXTAREA}`),
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
            dialog.element.classList.add(constants.CLASS_HIDDEN);

            dialog.mouseenterHandler();
            expect(annotatorUtil.showElement).to.be.called;
        });

        it('should do nothing if the element is already shown', () => {
            dialog.mouseenterHandler();
            expect(annotatorUtil.showElement).to.not.be.called;
        });

        it('should emit \'annotationcommentpending\' when user hovers back into a dialog that has a pending comment', () => {
            dialog.element.classList.add(constants.CLASS_HIDDEN);
            const commentsTextArea = dialog.element.querySelector(constants.SELECTOR_ANNOTATION_TEXTAREA);
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

            dialog.addAnnotation(
                new Annotation({
                    annotationID: 'someID',
                    text: 'blah',
                    user: {},
                    permissions: {}
                })
            );

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
            stubs.hideMobile = sandbox.stub(dialog, 'hideMobileDialog');
        });

        it('should post annotation when post annotation button is clicked', () => {
            stubs.findClosest.returns(constants.CLASS_ANNOTATION_BUTTON_POST);

            dialog.clickHandler(stubs.event);
            expect(stubs.post).to.be.called;
        });

        it('should cancel annotation when cancel annotation button is clicked', () => {
            stubs.findClosest.returns(constants.CLASS_ANNOTATION_BUTTON_CANCEL);
            dialog.isMobile = false;

            dialog.clickHandler(stubs.event);
            expect(stubs.cancel).to.be.called;
            expect(stubs.hideMobile).to.not.be.called;
            expect(stubs.deactivate).to.be.calledWith(true);
        });

        it('should only hide the mobile dialog when the cancel annotation button is clicked on mobile', () => {
            stubs.findClosest.returns(constants.CLASS_ANNOTATION_BUTTON_CANCEL);
            dialog.isMobile = true;

            dialog.clickHandler(stubs.event);
            expect(stubs.cancel).to.not.be.called;
            expect(stubs.hideMobile).to.be.called;
            expect(stubs.deactivate).to.be.calledWith(true);
        });

        it('should activate reply area when textarea is clicked', () => {
            stubs.findClosest.returns(CLASS_REPLY_TEXTAREA);

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
            stubs.findClosest.onFirstCall().returns(CLASS_CANCEL_DELETE);
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
            dialog.addAnnotationElement(
                new Annotation({
                    annotationID: 1,
                    text: 'the preview sdk is awesome!',
                    user: {},
                    permissions: {}
                })
            );
            const annotationComment = document.querySelector('.comment-text');
            expect(annotationComment).to.contain.html('the preview sdk is awesome!');
        });

        it('should display the posting message if the user id is 0', () => {
            dialog.addAnnotationElement(
                new Annotation({
                    annotationID: 1,
                    text: 'the preview sdk is awesome!',
                    user: { id: 0 },
                    permissions: {}
                })
            );
            const username = document.querySelector('.user-name');
            expect(username).to.contain.html(__('annotation_posting_message'));
        });

        it('should display user name if the user id is not 0', () => {
            dialog.addAnnotationElement(
                new Annotation({
                    annotationID: 1,
                    text: 'the preview sdk is awesome!',
                    user: { id: 1, name: 'user' },
                    permissions: {}
                })
            );
            const username = document.querySelector('.user-name');
            expect(username).to.contain.html('user');
        });

        it('should hide the delete icon if the user does\'nt have delete permissions', () => {
            dialog.addAnnotationElement(
                new Annotation({
                    annotationID: 1,
                    text: 'the preview sdk is amazing!',
                    user: { id: 1, name: 'user' },
                    permissions: { can_delete: false }
                })
            );
            const deleteButton = document.querySelector(`.${CLASS_BUTTON_DELETE_COMMENT}`);
            expect(deleteButton).to.have.class(constants.CLASS_HIDDEN);
        });

        it('should make the delete icon hidden if the delete permission is not specified', () => {
            dialog.addAnnotationElement(
                new Annotation({
                    annotationID: 1,
                    text: 'the preview sdk is amazing!',
                    user: { id: 1, name: 'user' },
                    permissions: {}
                })
            );
            const deleteButton = document.querySelector(`.${CLASS_BUTTON_DELETE_COMMENT}`);
            expect(deleteButton).to.have.class(constants.CLASS_HIDDEN);
        });

        it('should make delete icon visible if the user has delete permission', () => {
            dialog.addAnnotationElement(
                new Annotation({
                    annotationID: 1,
                    text: 'the preview sdk is amazing!',
                    user: { id: 1, name: 'user' },
                    permissions: { can_delete: true }
                })
            );
            const deleteButton = document.querySelector(`.${CLASS_BUTTON_DELETE_COMMENT}`);
            expect(deleteButton).to.not.have.class(constants.CLASS_HIDDEN);
        });

        it('should hide the delete confirmation UI by default', () => {
            dialog.addAnnotationElement(
                new Annotation({
                    annotationID: 1,
                    text: 'the preview sdk is amazing!',
                    user: { id: 1, name: 'user' },
                    permissions: { can_delete: true }
                })
            );
            const deleteConfirmation = document.querySelector(SELECTOR_DELETE_CONFIRMATION);
            expect(deleteConfirmation).to.have.class(constants.CLASS_HIDDEN);
        });

        it('should correctly format the date and time in a different locale', () => {
            const date = new Date();
            stubs.locale = sandbox.stub(Date.prototype, 'toLocaleString');
            dialog.locale = 'en-GB';

            dialog.addAnnotationElement(
                new Annotation({
                    annotationID: 1,
                    text: 'the preview sdk is amazing!',
                    user: { id: 1, name: 'user' },
                    permissions: { can_delete: true },
                    created: date
                })
            );
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
        it('should do nothing if the dialogEl does not exist', () => {
            dialog.dialogEl = null;
            sandbox.stub(annotatorUtil, 'showElement');
            dialog.activateReply();
            expect(annotatorUtil.showElement).to.not.be.called;
        });

        it('should do nothing if reply textarea is already active', () => {
            const replyTextEl = dialog.element.querySelector(`.${CLASS_REPLY_TEXTAREA}`);
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
            const replyTextEl = document.querySelector(`.${CLASS_REPLY_TEXTAREA}`);
            const buttonContainer = replyTextEl.parentNode.querySelector(constants.SELECTOR_BUTTON_CONTAINER);

            dialog.activateReply();
            expect(replyTextEl).to.have.class(constants.CLASS_ACTIVE);
            expect(buttonContainer).to.not.have.class(constants.CLASS_HIDDEN);
        });
    });

    describe('deactivateReply()', () => {
        it('should do nothing if element does not exist', () => {
            dialog.dialogEl = null;
            sandbox.stub(annotatorUtil, 'resetTextarea');

            dialog.deactivateReply();
            expect(annotatorUtil.resetTextarea).to.not.be.called;
        });

        it('should show the correct UI when the reply textarea is deactivated', () => {
            dialog.addAnnotationElement(
                new Annotation({
                    annotationID: 1,
                    text: 'the preview sdk is amazing!',
                    user: { id: 1, name: 'user' },
                    permissions: { can_delete: true }
                })
            );
            const replyTextEl = document.querySelector(`.${CLASS_REPLY_TEXTAREA}`);
            const buttonContainer = replyTextEl.parentNode.querySelector(constants.SELECTOR_BUTTON_CONTAINER);

            dialog.deactivateReply();
            expect(replyTextEl).to.not.have.class(constants.CLASS_ACTIVE);
            expect(buttonContainer).to.have.class(constants.CLASS_HIDDEN);
        });
    });

    describe('postReply()', () => {
        it('should not post reply to the dialog if it has no text', () => {
            dialog.addAnnotationElement(
                new Annotation({
                    annotationID: 1,
                    text: 'the preview sdk is amazing!',
                    user: { id: 1, name: 'user' },
                    permissions: { can_delete: true }
                })
            );
            dialog.activateReply();

            dialog.postReply();
            expect(stubs.emit).to.not.be.called;
        });

        it('should post a reply to the dialog if it has text', () => {
            dialog.addAnnotationElement(
                new Annotation({
                    annotationID: 1,
                    text: 'the preview sdk is amazing!',
                    user: { id: 1, name: 'user' },
                    permissions: { can_delete: true }
                })
            );
            const replyTextEl = document.querySelector(`.${CLASS_REPLY_TEXTAREA}`);
            dialog.activateReply();
            replyTextEl.innerHTML += 'the preview SDK is great!';

            dialog.postReply();
            expect(stubs.emit).to.be.calledWith('annotationcreate', { text: 'the preview SDK is great!' });
        });

        it('should clear the reply text element after posting', () => {
            dialog.addAnnotationElement(
                new Annotation({
                    annotationID: 1,
                    text: 'the preview sdk is amazing!',
                    user: { id: 1, name: 'user' },
                    permissions: { can_delete: true }
                })
            );
            const replyTextEl = document.querySelector(`.${CLASS_REPLY_TEXTAREA}`);
            dialog.activateReply();
            replyTextEl.innerHTML += 'the preview SDK is great!';

            dialog.postReply();
            expect(replyTextEl).to.have.value('');
        });
    });

    describe('showDeleteConfirmation()', () => {
        it('should show the correct UI when a user clicks on delete', () => {
            dialog.addAnnotationElement(
                new Annotation({
                    annotationID: 1,
                    text: 'the preview sdk is amazing!',
                    user: { id: 1, name: 'user' },
                    permissions: { can_delete: true }
                })
            );
            const showElementStub = sandbox.stub(annotatorUtil, 'showElement');

            dialog.showDeleteConfirmation(1);
            expect(showElementStub).to.be.called;
        });
    });

    describe('hideDeleteConfirmation()', () => {
        it('should show the correct UI when a user clicks cancel in the delete confirmation', () => {
            dialog.addAnnotationElement(
                new Annotation({
                    annotationID: 1,
                    text: 'the preview sdk is amazing!',
                    user: { id: 1, name: 'user' },
                    permissions: { can_delete: true }
                })
            );
            const hideElementStub = sandbox.stub(annotatorUtil, 'hideElement');
            dialog.showDeleteConfirmation(1);

            dialog.hideDeleteConfirmation(1);
            expect(hideElementStub).to.be.called;
        });
    });

    describe('deleteAnnotation()', () => {
        it('should emit the annotationdelete message', () => {
            dialog.addAnnotationElement(
                new Annotation({
                    annotationID: 1,
                    text: 'the preview sdk is amazing!',
                    user: { id: 1, name: 'user' },
                    permissions: { can_delete: true }
                })
            );

            dialog.deleteAnnotation(1);
            expect(stubs.emit).to.be.calledWith('annotationdelete', { annotationID: 1 });
        });
    });

    describe('generateDialogEl', () => {
        it('should generate a blank annotations dialog element', () => {
            const dialogEl = dialog.generateDialogEl(0);
            const createSectionEl = dialogEl.querySelector(constants.SECTION_CREATE);
            const showSectionEl = dialogEl.querySelector(constants.SECTION_SHOW);
            expect(createSectionEl).to.not.have.class(constants.CLASS_HIDDEN);
            expect(showSectionEl).to.have.class(constants.CLASS_HIDDEN);
        });

        it('should generate an annotations dialog element with annotations', () => {
            const dialogEl = dialog.generateDialogEl(1);
            const createSectionEl = dialogEl.querySelector(constants.SECTION_CREATE);
            const showSectionEl = dialogEl.querySelector(constants.SECTION_SHOW);
            expect(createSectionEl).to.have.class(constants.CLASS_HIDDEN);
            expect(showSectionEl).to.not.have.class(constants.CLASS_HIDDEN);
        });
    });

    describe('flipDialog()', () => {
        const containerHeight = 5;

        beforeEach(() => {
            sandbox.stub(dialog.element, 'querySelector').returns(document.createElement('div'));
            sandbox.stub(dialog, 'fitDialogHeightInPage');
            sandbox.stub(dialog, 'toggleFlippedThreadEl');
        });

        afterEach(() => {
            dialog.element = null;
        });

        it('should keep the dialog below the annotation icon if the annotation is in the top half of the viewport', () => {
            const { top, bottom } = dialog.flipDialog(2, containerHeight);
            expect(dialog.element).to.not.have.class(CLASS_FLIPPED_DIALOG);
            expect(top).not.equals('');
            expect(bottom).equals('');
            expect(dialog.fitDialogHeightInPage).to.be.called;
            expect(dialog.toggleFlippedThreadEl).to.be.called;
        });

        it('should flip the dialog above the annotation icon if the annotation is in the lower half of the viewport', () => {
            const { top, bottom } = dialog.flipDialog(4, containerHeight);
            expect(dialog.element).to.have.class(CLASS_FLIPPED_DIALOG);
            expect(top).equals('');
            expect(bottom).not.equals('');
        });
    });

    describe('toggleFlippedThreadEl()', () => {
        beforeEach(() => {
            dialog.threadEl = document.createElement('div');
        });

        it('should do nothing if the dialog is not flipped', () => {
            stubs.add = sandbox.stub(dialog.threadEl.classList, 'add');
            stubs.remove = sandbox.stub(dialog.threadEl.classList, 'remove');
            dialog.toggleFlippedThreadEl();
            expect(stubs.add).to.not.be.called;
            expect(stubs.remove).to.not.be.called;
        });

        it('should reset thread icon if dialog is flipped and hidden', () => {
            dialog.element.classList.add(CLASS_FLIPPED_DIALOG);
            stubs.add = sandbox.stub(dialog.threadEl.classList, 'add');
            stubs.remove = sandbox.stub(dialog.threadEl.classList, 'remove');
            dialog.toggleFlippedThreadEl();
            expect(stubs.add).to.be.called;
            expect(stubs.remove).to.not.be.called;
        })

        it('should flip thread icon if dialog is flipped and not hidden', () => {
            dialog.element.classList.add(CLASS_FLIPPED_DIALOG);
            dialog.element.classList.add(constants.CLASS_HIDDEN);
            stubs.add = sandbox.stub(dialog.threadEl.classList, 'add');
            stubs.remove = sandbox.stub(dialog.threadEl.classList, 'remove');
            dialog.toggleFlippedThreadEl();
            expect(stubs.add).to.not.be.called;
            expect(stubs.remove).to.be.called;
        })
    });

    describe('fitDialogHeightInPage()', () => {
        it('should allow scrolling on annotations dialog if file is a powerpoint', () => {
            dialog.dialogEl = { style: {} };
            dialog.container = { clientHeight: 100 };
            dialog.fitDialogHeightInPage();
            expect(dialog.dialogEl.style.maxHeight).equals('50px');
        });
    });
});
