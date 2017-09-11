/* eslint-disable no-unused-expressions */
import DocHighlightDialog from '../DocHighlightDialog';
import Annotation from '../../Annotation';
import AnnotationDialog from '../../AnnotationDialog';
import * as annotatorUtil from '../../annotatorUtil';
import * as docAnnotatorUtil from '../docAnnotatorUtil';
import * as util from '../../annotatorUtil';
import * as constants from '../../annotationConstants';

let dialog;
const sandbox = sinon.sandbox.create();
let stubs = {};

const CLASS_HIGHLIGHT_DIALOG = 'bp-highlight-dialog';
const CLASS_TEXT_HIGHLIGHTED = 'bp-is-text-highlighted';
const CLASS_HIGHLIGHT_LABEL = 'bp-annotation-highlight-label';
const DATA_TYPE_HIGHLIGHT_BTN = 'highlight-btn';
const DATA_TYPE_ADD_HIGHLIGHT_COMMENT = 'add-highlight-comment-btn';
const PAGE_PADDING_TOP = 15;

describe('lib/annotations/doc/DocHighlightDialog', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('annotations/doc/__tests__/DocHighlightDialog-test.html');

        dialog = new DocHighlightDialog({
            annotatedElement: document.querySelector('.annotated-element'),
            location: {
                page: 1
            },
            annotations: [],
            canAnnotate: true
        });
        dialog.setup([]);
        document.querySelector('.annotated-element').appendChild(dialog.element);

        stubs.emit = sandbox.stub(dialog, 'emit');
    });

    afterEach(() => {
        const dialogEl = document.querySelector('.annotated-element');
        dialogEl.parentNode.removeChild(dialogEl);
        sandbox.verifyAndRestore();
        if (typeof dialog.destroy === 'function') {
            dialog.destroy();
            dialog = null;
        }

        stubs = {};
    });

    describe('addAnnotation()', () => {
        beforeEach(() => {
            stubs.addFunc = AnnotationDialog.prototype.addAnnotation;
            Object.defineProperty(AnnotationDialog.prototype, 'addAnnotation', { value: sandbox.mock() });
            sandbox.stub(dialog, 'position');
        });

        afterEach(() => {
            Object.defineProperty(AnnotationDialog.prototype, 'addAnnotation', { value: stubs.addFunc });
        });

        it('should add a highlight comment annotation', () => {
            dialog.addAnnotation(
                new Annotation({
                    text: 'blargh',
                    user: { id: 1, name: 'Bob' }
                })
            );
            expect(dialog.position).to.not.be.called;
        });

        it('should add a plain highlight annotation', () => {
            dialog.addAnnotation(
                new Annotation({
                    text: '',
                    user: { id: 1, name: 'Bob' }
                })
            );

            const highlightLabelEl = dialog.element.querySelector(`.${CLASS_HIGHLIGHT_LABEL}`);
            expect(highlightLabelEl).to.contain.html('Bob highlighted');
            expect(dialog.position).to.be.called;
        });
    });

    describe('postAnnotation()', () => {
        beforeEach(() => {
            stubs.postFunc = AnnotationDialog.prototype.postAnnotation;
            Object.defineProperty(AnnotationDialog.prototype, 'postAnnotation', { value: sandbox.stub() });
        });

        afterEach(() => {
            Object.defineProperty(AnnotationDialog.prototype, 'postAnnotation', { value: stubs.postFunc });
        });
        it('should do nothing if not text is present', () => {
            const headerQuery = sandbox.stub(dialog.element, 'querySelector').withArgs('.bp-annotation-mobile-header');
            dialog.postAnnotation(' ');

            expect(headerQuery).to.not.be.called;
        });

        it('should not modify mobile ui there is no mobile header present', () => {
            const headerQuery = sandbox.stub(dialog.element, 'querySelector').withArgs('.bp-annotation-mobile-header').returns(null);
            const elRemove = sandbox.stub(dialog.element.classList, 'remove');
            dialog.postAnnotation('This is the water and this is the well.');

            expect(elRemove).to.not.be.called;
        });

        it('should show the mobile header', () => {
            dialog.isMobile = true;
            const headerEl = {
                classList: {
                    remove: sandbox.stub()
                }
            };
            const headerQuery = sandbox.stub(dialog.element, 'querySelector').withArgs('.bp-annotation-mobile-header');
            dialog.postAnnotation('Drink full and descend.');
        });

        it('should remove the plain highlight class from the dialog', () => {
            dialog.isMobile = true;
            const headerEl = {
                classList: {
                    remove: sandbox.stub()
                }
            };
            const headerQuery = sandbox.stub(dialog.element, 'querySelector')
                .withArgs('.bp-annotation-mobile-header').returns(headerEl);
            const elRemove = sandbox.stub(dialog.element.classList, 'remove');
            dialog.postAnnotation('The horse is the white of the eyes, dark within.');

            expect(elRemove).to.be.calledWith(constants.CLASS_ANNOTATION_PLAIN_HIGHLIGHT);
        });
    });

    describe('hideCommentsDialog()', () => {
        it('should do nothing if no comment dialog is present', () => {
            const classAdd = sandbox.stub(dialog.element.classList, 'add');
            dialog.commentsDialogEl = null;
            dialog.hideCommentsDialog();

            expect(classAdd).to.not.be.called;
        });

        it('should do nothing if no highlight dialog present', () => {
            const classAdd = sandbox.stub(dialog.element.classList, 'add');
            dialog.highlightDialogEl = null;
            dialog.hideCommentsDialog();

            expect(classAdd).to.not.be.called;
        });

        it('should do nothing if the comment dialog is already hidden', () => {
            const classAdd = sandbox.stub(dialog.element.classList, 'add');
            dialog.highlightDialogEl = {};
            sandbox.stub(dialog.commentsDialogEl.classList, 'contains').withArgs(constants.CLASS_HIDDEN).returns(true);
            dialog.hideCommentsDialog();

            expect(classAdd).to.not.be.called;
        });

        it('should hide the comment dialog', () => {
            dialog.highlightDialogEl = {
                classList: {
                    remove: () => {}
                }
            };
            dialog.hideCommentsDialog();

            expect(dialog.commentsDialogEl.classList.contains(constants.CLASS_HIDDEN)).to.be.true;
        });

        it('should add Highlight Dialog class to the dialog.element', () => {
            dialog.commentsDialogEl.classList.remove(constants.CLASS_HIDDEN);
            dialog.highlightDialogEl = {
                classList: {
                    remove: () => {}
                }
            };
            dialog.hideCommentsDialog();

            expect(dialog.element.classList.contains(CLASS_HIGHLIGHT_DIALOG)).to.be.true;
        });

        it('should show the highlight dialog', () => {
            dialog.commentsDialogEl.classList.remove(constants.CLASS_HIDDEN);
            dialog.highlightDialogEl = {
                classList: {
                    remove: sandbox.stub()
                }
            };
            dialog.hideCommentsDialog();

            expect(dialog.highlightDialogEl.classList.remove).to.be.calledWith(constants.CLASS_HIDDEN);
        });
    });

    describe('show()', () => {
        beforeEach(() => {
            Object.defineProperty(AnnotationDialog.prototype, 'show', { value: sandbox.stub() });
        });

        it('should show the highlight button if it has been enabled', () => {
            dialog.show(true, true);
            const button = dialog.highlightDialogEl.querySelector(`button.${constants.CLASS_ADD_HIGHLIGHT_BTN}`);
            expect(button.classList.contains(constants.CLASS_HIDDEN)).to.be.false;
        });

        it('should hide the highlight button if it has been disabled', () => {
            dialog.show(false, true);
            const button = dialog.highlightDialogEl.querySelector(`button.${constants.CLASS_ADD_HIGHLIGHT_BTN}`);
            expect(button.classList.contains(constants.CLASS_HIDDEN)).to.be.true;
        });

        it('should show the comment button if it has been enabled', () => {
            dialog.show(true, true);
            const button = dialog.highlightDialogEl.querySelector(`button.${constants.CLASS_ADD_HIGHLIGHT_COMMENT_BTN}`);
            expect(button.classList.contains(constants.CLASS_HIDDEN)).to.be.false;
        });

        it('should hide the comment button if it has been disabled', () => {
            dialog.show(true, false);
            const button = dialog.highlightDialogEl.querySelector(`button.${constants.CLASS_ADD_HIGHLIGHT_COMMENT_BTN}`);
            expect(button.classList.contains(constants.CLASS_HIDDEN)).to.be.true;
        });
    });

    describe('position()', () => {
        beforeEach(() => {
            stubs.scaled = sandbox.stub(dialog, 'getScaledPDFCoordinates').returns([150, 2]);
            stubs.width = sandbox.stub(dialog, 'getDialogWidth');
            stubs.caret = sandbox.stub(annotatorUtil, 'repositionCaret');
            stubs.show = sandbox.stub(annotatorUtil, 'showElement');
            stubs.fit = sandbox.stub(dialog, 'fitDialogHeightInPage');
        });

        it('should position the plain highlight dialog at the right place and show it', () => {
            dialog.hasComments = false;
            stubs.width.returns(100);
            stubs.caret.returns(10);

            dialog.position();

            expect(stubs.scaled).to.have.been.called;
            expect(stubs.width).to.have.been.called;
            expect(stubs.caret).to.have.been.called;
            expect(stubs.show).to.have.been.called;
            expect(dialog.element.style.left).equals('10px');
        });

        it('should position the highlight comments dialog at the right place and show it', () => {
            dialog.hasComments = true;
            stubs.caret.returns(10);

            dialog.position();

            expect(stubs.scaled).to.have.been.called;
            expect(stubs.width).to.have.been.called;
            expect(stubs.caret).to.have.been.called;
            expect(stubs.show).to.have.been.called;
            expect(dialog.element.style.left).equals('10px');
        });

        it('should adjust the dialog if the mouse location is above the page', () => {
            dialog.hasComments = false;
            stubs.scaled.returns([150, -1]);

            dialog.position();

            expect(stubs.scaled).to.have.been.called;
            expect(dialog.element.style.top).equals(`${PAGE_PADDING_TOP}px`);
        });

        it('should adjust the dialog if the dialog will run below the page', () => {
            dialog.hasComments = false;

            dialog.position();

            expect(stubs.scaled).to.have.been.called;
            expect(dialog.element.style.top).equals(`${PAGE_PADDING_TOP}px`);
        });
    });

    describe('toggleHighlightDialogs()', () => {
        it('should display comments dialog on toggle when comments dialog is currently hidden', () => {
            const commentsDialogEl = dialog.element.querySelector(constants.SELECTOR_ANNOTATION_CONTAINER);
            commentsDialogEl.classList.add(constants.CLASS_HIDDEN);

            sandbox.stub(annotatorUtil, 'hideElement');
            sandbox.stub(dialog, 'position');

            dialog.toggleHighlightDialogs();

            expect(dialog.element).to.have.class(constants.CLASS_ANNOTATION_DIALOG);
            expect(dialog.position).to.have.been.called;
        });

        it('should display highlight buttons dialog on toggle when comments dialog is currently shown', () => {
            const commentsDialogEl = dialog.element.querySelector(constants.SELECTOR_ANNOTATION_CONTAINER);
            commentsDialogEl.classList.remove(constants.CLASS_HIDDEN);

            sandbox.stub(annotatorUtil, 'hideElement');
            sandbox.stub(dialog, 'position');

            dialog.toggleHighlightDialogs();

            expect(dialog.element).to.not.have.class(constants.CLASS_ANNOTATION_DIALOG);
            expect(dialog.position).to.have.been.called;
        });
    });

    describe('toggleHighlightCommentsReply()', () => {
        it('should display "Reply" text area in dialog when multiple comments exist', () => {
            const replyTextEl = dialog.commentsDialogEl.querySelector(constants.SECTION_CREATE);
            const commentTextEl = dialog.commentsDialogEl.querySelector(constants.SECTION_SHOW);

            sandbox.stub(dialog, 'position');

            dialog.toggleHighlightCommentsReply(true);

            expect(commentTextEl).to.not.have.class(constants.CLASS_HIDDEN);
            expect(replyTextEl).to.have.class(constants.CLASS_HIDDEN);
        });

        it('should display "Add a comment here" text area in dialog when no comments exist', () => {
            const replyTextEl = dialog.commentsDialogEl.querySelector(constants.SECTION_CREATE);
            const commentTextEl = dialog.commentsDialogEl.querySelector(constants.SECTION_SHOW);

            sandbox.stub(dialog, 'position');

            dialog.toggleHighlightCommentsReply(false);

            expect(commentTextEl.classList.contains(constants.CLASS_HIDDEN)).to.be.true;
            expect(replyTextEl.classList.contains(constants.CLASS_HIDDEN)).to.be.false;
        });

        it('should reposition the dialog if using a desktop browser', () => {
            sandbox.stub(dialog, 'position');
            dialog.toggleHighlightCommentsReply();
            expect(dialog.position).to.be.called;
        });

        it('should not reposition the dialog on a mobile device', () => {
            sandbox.stub(dialog, 'position');
            dialog.isMobile = true;
            dialog.toggleHighlightCommentsReply();
            expect(dialog.position).to.not.be.called;
        });
    });

    describe('setup()', () => {
        beforeEach(() => {
            stubs.annotation = new Annotation({
                text: 'blargh',
                user: { id: 1, name: 'Bob' },
                permissions: {
                    can_delete: true
                },
                threadNumber: 1
            });
            stubs.show = sandbox.stub(annotatorUtil, 'showElement');
            stubs.hide = sandbox.stub(annotatorUtil, 'hideElement');
        });

        it('should create a dialog element if it does not already exist', () => {
            dialog.element = null;
            dialog.setup([]);
            expect(dialog.element).is.not.null;
        });

        it('should set hasComments according to the number of annotations in the thread', () => {
            dialog.hasComments = null;
            dialog.setup([stubs.annotation]);
            expect(dialog.hasComments).to.be.true;

            dialog.hasComments = null;
            stubs.annotation.text = '';
            dialog.setup([stubs.annotation]);
            expect(dialog.hasComments).to.be.false;
        });

        it('should hide the highlight dialog if thread has comments', () => {
            dialog.hasComments = true;
            dialog.setup([stubs.annotation]);
            expect(dialog.highlightDialogEl).to.have.class(constants.CLASS_HIDDEN);
        });

        it('should hide the comments dialog if thread does not have comments', () => {
            dialog.hasComments = false;
            const annotation = new Annotation({
                text: '',
                user: { id: 1, name: 'Bob' },
                permissions: {
                    can_delete: true
                },
                threadNumber: 1
            });

            dialog.setup([annotation]);
            expect(dialog.commentsDialogEl).to.have.class(constants.CLASS_HIDDEN);
        });

        it('should setup the dialog element and add thread number to the dialog', () => {
            dialog.setup([stubs.annotation]);
            expect(dialog.element.dataset.threadNumber).equals('1');
        });

        it('should not set the thread number when using a mobile browser', () => {
            dialog.isMobile = true;
            dialog.setup([stubs.annotation]);
            expect(dialog.element.dataset.threadNumber).to.be.undefined;
        });

        it('should add the text highlighted class if thread has multiple annotations', () => {
            dialog.setup([stubs.annotation]);
            expect(dialog.dialogEl).to.have.class(CLASS_TEXT_HIGHLIGHTED);
        });

        it('should setup and show plain highlight dialog', () => {
            sandbox.stub(annotatorUtil, 'isPlainHighlight').returns(true);
            dialog.setup([stubs.annotation]);
            expect(stubs.show).to.be.called;
        });

        it('should hide all buttons on plain highlights if user does not have canAnnotate permissions', () => {
            sandbox.stub(annotatorUtil, 'isPlainHighlight').returns(true);
            dialog.canAnnotate = false;

            dialog.setup([stubs.annotation]);
            const highlightLabelEl = dialog.highlightDialogEl.querySelector(`.${CLASS_HIGHLIGHT_LABEL}`);
            const highlightBtns = dialog.highlightDialogEl.querySelector(constants.SELECTOR_HIGHLIGHT_BTNS);
            const addHighlightBtn = dialog.highlightDialogEl.querySelector(constants.SELECTOR_ADD_HIGHLIGHT_BTN);
            expect(stubs.show).to.be.calledWith(highlightLabelEl);
            expect(stubs.hide).to.be.calledWith(highlightBtns);
            expect(stubs.hide).to.not.be.calledWith(addHighlightBtn);
        });

        it('should hide delete button on plain highlights if user does not have delete permissions', () => {
            sandbox.stub(annotatorUtil, 'isPlainHighlight').returns(true);
            stubs.annotation.permissions.can_delete = false;

            dialog.setup([stubs.annotation]);
            const highlightLabelEl = dialog.highlightDialogEl.querySelector(`.${CLASS_HIGHLIGHT_LABEL}`);
            const addHighlightBtn = dialog.highlightDialogEl.querySelector(constants.SELECTOR_ADD_HIGHLIGHT_BTN);
            expect(stubs.show).to.be.calledWith(highlightLabelEl);
            expect(stubs.hide).to.be.calledWith(addHighlightBtn);
        });

        it('should add annotation elements', () => {
            stubs.add = sandbox.stub(dialog, 'addAnnotationElement');
            dialog.setup([stubs.annotation, stubs.annotation]);
            expect(stubs.add).to.be.calledTwice;
        });

        it('should bind DOM listeners', () => {
            stubs.bind = sandbox.stub(dialog, 'bindDOMListeners');
            dialog.setup([stubs.annotation]);
            expect(stubs.bind).to.be.called;
        });

        it('should not bind DOM listeners if using a mobile browser', () => {
            stubs.bind = sandbox.stub(dialog, 'bindDOMListeners');
            dialog.isMobile = true;
            dialog.setup([stubs.annotation]);
            expect(stubs.bind).to.not.be.called;
        });
    });

    describe('bindDOMListeners()', () => {
        it('should bind DOM listeners', () => {
            stubs.add = sandbox.stub(dialog.element, 'addEventListener');

            dialog.bindDOMListeners();
            expect(stubs.add).to.be.calledWith('mousedown', sinon.match.func);
            expect(stubs.add).to.be.calledWith('keydown', sinon.match.func);
            expect(stubs.add).to.be.calledWith('mouseleave', sinon.match.func);
            expect(stubs.add).to.be.calledWith('mouseenter', sinon.match.func);
        });

        it('should not bind mouseenter/leave events for mobile browsers', () => {
            stubs.add = sandbox.stub(dialog.element, 'addEventListener');
            dialog.isMobile = true;

            dialog.bindDOMListeners();
            expect(stubs.add).to.be.calledWith('mousedown', sinon.match.func);
            expect(stubs.add).to.be.calledWith('keydown', sinon.match.func);
            expect(stubs.add).to.not.be.calledWith('mouseenter', sinon.match.func);
            expect(stubs.add).to.not.be.calledWith('mouseleave', sinon.match.func);
        });
    });

    describe('unbindDOMListeners()', () => {
        it('should unbind DOM listeners', () => {
            stubs.remove = sandbox.stub(dialog.element, 'removeEventListener');

            dialog.unbindDOMListeners();
            expect(stubs.remove).to.be.calledWith('mousedown', sinon.match.func);
            expect(stubs.remove).to.be.calledWith('keydown', sinon.match.func);
            expect(stubs.remove).to.be.calledWith('mouseleave', sinon.match.func);
            expect(stubs.remove).to.be.calledWith('mouseenter', sinon.match.func);
        });

        it('should not unbind mouseenter/leave events for mobile browsers', () => {
            stubs.remove = sandbox.stub(dialog.element, 'removeEventListener');
            dialog.isMobile = true;

            dialog.unbindDOMListeners();
            expect(stubs.remove).to.be.calledWith('mousedown', sinon.match.func);
            expect(stubs.remove).to.be.calledWith('keydown', sinon.match.func);
            expect(stubs.remove).to.not.be.calledWith('mouseenter', sinon.match.func);
            expect(stubs.remove).to.not.be.calledWith('mouseleave', sinon.match.func);
        });
    });

    describe('keydownHandler()', () => {
        const event = {
            stopPropagation: sandbox.stub()
        };

        it('should call mousedownHandler if \'Enter\' is pressed', () => {
            sandbox.stub(util, 'decodeKeydown').returns('Enter');
            sandbox.stub(dialog, 'mousedownHandler');
            dialog.keydownHandler(event);
            expect(dialog.mousedownHandler).to.be.called;
        });

        it('should not call mousedownHandler if a key other than \'Enter\' is pressed', () => {
            sandbox.stub(util, 'decodeKeydown').returns('Delete');
            sandbox.stub(dialog, 'mousedownHandler');
            dialog.keydownHandler(event);
            expect(dialog.mousedownHandler).to.not.be.called;
        });
    });

    describe('mousedownHandler()', () => {
        const event = {
            stopPropagation: sandbox.stub(),
            preventDefault: sandbox.stub()
        };

        beforeEach(() => {
            stubs.dataType = sandbox.stub(annotatorUtil, 'findClosestDataType');
            sandbox.stub(dialog, 'toggleHighlight');
            sandbox.stub(dialog, 'toggleHighlightCommentsReply');
            sandbox.stub(dialog, 'toggleHighlightDialogs');
            sandbox.stub(dialog, 'focusAnnotationsTextArea');
        });

        it('should create/remove a highlight when the \'highlight-btn\' is pressed', () => {
            stubs.dataType.returns(DATA_TYPE_HIGHLIGHT_BTN);
            dialog.mousedownHandler(event);
            expect(stubs.emit).to.be.calledWith('annotationdraw');
            expect(dialog.toggleHighlight).to.be.called;
        });

        it('should create highlight when the \'add-highlight-comment-btn\' is pressed', () => {
            stubs.dataType.returns(DATA_TYPE_ADD_HIGHLIGHT_COMMENT);
            dialog.mousedownHandler(event);
            expect(stubs.emit).to.be.calledWith('annotationdraw');
            expect(dialog.toggleHighlightCommentsReply).to.be.called;
            expect(dialog.toggleHighlightDialogs).to.be.called;
            expect(event.preventDefault).to.be.called;
            expect(dialog.focusAnnotationsTextArea).to.be.called;
        });

        it('should not create a highlight when any other button is pressed', () => {
            stubs.dataType.returns('anything-else');
            dialog.mousedownHandler(event);
            expect(stubs.emit).to.not.be.calledWith('annotationdraw');
        });
    });

    describe('toggleHighlightIcon()', () => {
        it('should display active highlight icon when highlight is active', () => {
            const addHighlightBtn = dialog.element.querySelector(constants.SELECTOR_ADD_HIGHLIGHT_BTN);
            dialog.toggleHighlightIcon(constants.HIGHLIGHT_FILL.active);
            expect(addHighlightBtn).to.have.class(constants.CLASS_ACTIVE);
        });

        it('should display normal \'text highlighted\' highlight icon when highlight is not active', () => {
            const addHighlightBtn = dialog.element.querySelector(constants.SELECTOR_ADD_HIGHLIGHT_BTN);
            dialog.toggleHighlightIcon(constants.HIGHLIGHT_FILL.normal);
            expect(addHighlightBtn).to.not.have.class(constants.CLASS_ACTIVE);
        });
    });

    describe('toggleHighlight()', () => {
        it('should delete a blank annotation if text is highlighted', () => {
            dialog.dialogEl.classList.add(CLASS_TEXT_HIGHLIGHTED);
            dialog.toggleHighlight();
            expect(dialog.hasComments).to.be.true;
            expect(stubs.emit).to.be.calledWith('annotationdelete');
        });

        it('should create a blank annotation if text is not highlighted', () => {
            dialog.dialogEl.classList.remove(CLASS_TEXT_HIGHLIGHTED);

            dialog.toggleHighlight();
            expect(dialog.dialogEl).to.have.class(CLASS_TEXT_HIGHLIGHTED);
            expect(dialog.hasComments).to.be.false;
            expect(stubs.emit).to.be.calledWith('annotationcreate');
        });
    });

    describe('focusAnnotationsTextArea()', () => {
        beforeEach(() => {
            stubs.textarea = {
                focus: () => {}
            };
            stubs.textMock = sandbox.mock(stubs.textarea);
            sandbox.stub(dialog.dialogEl, 'querySelector').returns(stubs.textarea);
        });

        it('should focus the add comment area if it exists', () => {
            stubs.textMock.expects('focus');
            sandbox.stub(annotatorUtil, 'isElementInViewport').returns(true);
            dialog.focusAnnotationsTextArea();
        });

        it('should do nothing if the add comment area does not exist', () => {
            stubs.textMock.expects('focus').never();
            sandbox.stub(annotatorUtil, 'isElementInViewport').returns(false);
            dialog.focusAnnotationsTextArea();
        });
    });

    describe('getDialogWidth', () => {
        it('should calculate dialog width once annotator\'s user name has been populated', () => {
            const highlightLabelEl = dialog.element.querySelector(`.${CLASS_HIGHLIGHT_LABEL}`);
            highlightLabelEl.innerHTML = 'Bob highlighted';
            dialog.element.style.width = '100px';
            dialog.element.style.left = '30px';

            const width = dialog.getDialogWidth();
            expect(width).equals(100);
            expect(dialog.element.style.left).equals('30px');
        });

        it('should return previously set dialog width if already calculated', () => {
            dialog.element.style.width = '252px';
            const width = dialog.getDialogWidth();
            expect(width).equals(252); // Default comments dialog width
        });
    });

    describe('getScaledPDFCoordinates()', () => {
        it('should lower right corner coordinates of dialog when a highlight does not have comments', () => {
            dialog.hasComments = false;

            sandbox.stub(annotatorUtil, 'getScale').returns(1);
            sandbox.stub(annotatorUtil, 'getDimensionScale');
            stubs.corner = sandbox.stub(docAnnotatorUtil, 'getLowerRightCornerOfLastQuadPoint').returns([200, 2]);

            dialog.getScaledPDFCoordinates({}, 100);

            expect(stubs.corner).to.have.been.called;
        });
    });

    describe('addAnnotationElement()', () => {
        it('should not add a comment if the text is blank', () => {
            dialog.addAnnotationElement(
                new Annotation({
                    annotationID: 1,
                    text: '',
                    user: {},
                    permissions: {}
                })
            );
            const highlight = dialog.element.querySelector(constants.SELECTOR_ANNOTATION_HIGHLIGHT_DIALOG);
            const comment = document.querySelector('.annotation-comment');

            expect(comment).to.be.null;
            expect(highlight.dataset.annotationId).equals('1');
        });
    });

    describe('generateHighlightDialogEl()', () => {
        it('should return a highlight annotation dialog DOM element', () => {
            const highlightEl = dialog.generateHighlightDialogEl();
            const highlightBtnEl = highlightEl.querySelector(constants.SELECTOR_HIGHLIGHT_BTNS);
            expect(highlightBtnEl).to.not.be.null;
        });
    });
});
