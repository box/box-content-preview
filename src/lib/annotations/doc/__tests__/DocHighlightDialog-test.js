/* eslint-disable no-unused-expressions */
import DocHighlightDialog from '../DocHighlightDialog';
import Annotation from '../../Annotation';
import AnnotationDialog from '../../AnnotationDialog';
import * as annotatorUtil from '../../annotatorUtil';
import * as docAnnotatorUtil from '../docAnnotatorUtil';
import { CLASS_HIDDEN } from '../../../constants';
import * as constants from '../../annotationConstants';

let dialog;
const sandbox = sinon.sandbox.create();
let stubs = {};

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

            const highlightLabelEl = dialog.element.querySelector('.bp-annotation-highlight-label');
            expect(highlightLabelEl).to.contain.html('Bob highlighted');
            expect(dialog.position).to.be.called;
        });
    });

    describe('position()', () => {
        beforeEach(() => {
            stubs.scaled = sandbox.stub(dialog, 'getScaledPDFCoordinates').returns([150, 2]);
            stubs.width = sandbox.stub(dialog, 'getDialogWidth');
            stubs.caret = sandbox.stub(annotatorUtil, 'repositionCaret');
            stubs.show = sandbox.stub(annotatorUtil, 'showElement');
            stubs.fit = sandbox.stub(docAnnotatorUtil, 'fitDialogHeightInPage');
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
            expect(dialog.element.style.left).to.equal('10px');
        });

        it('should position the highlight comments dialog at the right place and show it', () => {
            dialog.hasComments = true;
            stubs.caret.returns(10);

            dialog.position();

            expect(stubs.scaled).to.have.been.called;
            expect(stubs.width).to.have.been.called;
            expect(stubs.caret).to.have.been.called;
            expect(stubs.show).to.have.been.called;
            expect(dialog.element.style.left).to.equal('10px');
        });

        it('should adjust the dialog if the mouse location is above the page', () => {
            dialog.hasComments = false;
            stubs.scaled.returns([150, -1]);

            dialog.position();

            expect(stubs.scaled).to.have.been.called;
            expect(dialog.element.style.top).to.equal(`${PAGE_PADDING_TOP}px`);
        });

        it('should adjust the dialog if the dialog will run below the page', () => {
            dialog.hasComments = false;

            dialog.position();

            expect(stubs.scaled).to.have.been.called;
            expect(dialog.element.style.top).to.equal(`${PAGE_PADDING_TOP}px`);
        });
    });

    describe('toggleHighlightDialogs()', () => {
        it('should display comments dialog on toggle when comments dialog is currently hidden', () => {
            const commentsDialogEl = dialog.element.querySelector('.annotation-container');
            commentsDialogEl.classList.add(CLASS_HIDDEN);

            sandbox.stub(annotatorUtil, 'hideElement');
            sandbox.stub(dialog, 'position');

            dialog.toggleHighlightDialogs();

            expect(dialog.element).to.have.class(constants.CLASS_ANNOTATION_DIALOG);
            expect(dialog.position).to.have.been.called;
        });

        it('should display highlight buttons dialog on toggle when comments dialog is currently shown', () => {
            const commentsDialogEl = dialog.element.querySelector('.annotation-container');
            commentsDialogEl.classList.remove(CLASS_HIDDEN);

            sandbox.stub(annotatorUtil, 'hideElement');
            sandbox.stub(dialog, 'position');

            dialog.toggleHighlightDialogs();

            expect(dialog.element).to.not.have.class(constants.CLASS_ANNOTATION_DIALOG);
            expect(dialog.position).to.have.been.called;
        });
    });

    describe('toggleHighlightCommentsReply()', () => {
        it('should display "Reply" text area in dialog when multiple comments exist', () => {
            const replyTextEl = dialog.commentsDialogEl.querySelector('[data-section="create"]');
            const commentTextEl = dialog.commentsDialogEl.querySelector('[data-section="show"]');

            sandbox.stub(dialog, 'position');

            dialog.toggleHighlightCommentsReply(true);

            expect(commentTextEl).to.not.have.class(CLASS_HIDDEN);
            expect(replyTextEl).to.have.class(CLASS_HIDDEN);
        });

        it('should display "Add a comment here" text area in dialog when no comments exist', () => {
            const replyTextEl = dialog.commentsDialogEl.querySelector('[data-section="create"]');
            const commentTextEl = dialog.commentsDialogEl.querySelector('[data-section="show"]');

            sandbox.stub(dialog, 'position');

            dialog.toggleHighlightCommentsReply(false);

            expect(commentTextEl.classList.contains(CLASS_HIDDEN)).to.be.true;
            expect(replyTextEl.classList.contains(CLASS_HIDDEN)).to.be.false;
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
                thread: 1
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

        it('should hide the highlight dialog if thread has more than 1 annotation', () => {
            dialog.setup([stubs.annotation, stubs.annotation]);
            expect(dialog.highlightDialogEl).to.have.class(CLASS_HIDDEN);
        });

        it('should hide the comments dialog if thread only 1 annotation', () => {
            dialog.setup([stubs.annotation]);
            expect(dialog.commentsDialogEl).to.have.class(CLASS_HIDDEN);
        });

        it('should setup the dialog element and add thread number to the dialog', () => {
            dialog.setup([stubs.annotation]);
            expect(dialog.element.dataset.threadNumber).to.equal('1');
        });

        it('should not set the thread number when using a mobile browser', () => {
            dialog.isMobile = true;
            dialog.setup([stubs.annotation]);
            expect(dialog.element.dataset.threadNumber).to.be.undefined;
        });

        it('should add the text highlighted class if thread has multiple annotations', () => {
            dialog.setup([stubs.annotation]);
            expect(dialog.dialogEl).to.have.class(constants.CLASS_ANNOTATION_TEXT_HIGHLIGHTED);
        });

        it('should setup and show plain highlight dialog', () => {
            sandbox.stub(annotatorUtil, 'isPlainHighlight').returns(true);
            dialog.setup([stubs.annotation]);
            expect(stubs.show).to.be.called;
        });

        it('should hide delete button on plain highlights if user does not have permissions', () => {
            sandbox.stub(annotatorUtil, 'isPlainHighlight').returns(true);
            stubs.annotation.permissions.can_delete = false;

            dialog.setup([stubs.annotation]);
            const highlightLabelEl = dialog.highlightDialogEl.querySelector('.bp-annotation-highlight-label');
            const addHighlightBtn = dialog.highlightDialogEl.querySelector('.bp-add-highlight-btn');
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

    describe('toggleHighlightIcon()', () => {
        it('should display active highlight icon when highlight is active', () => {
            const addHighlightBtn = dialog.element.querySelector('.bp-add-highlight-btn');
            dialog.toggleHighlightIcon(constants.HIGHLIGHT_ACTIVE_FILL_STYLE);
            expect(addHighlightBtn).to.have.class('highlight-active');
        });

        it('should display normal \'text highlighted\' highlight icon when highlight is not active', () => {
            const addHighlightBtn = dialog.element.querySelector('.bp-add-highlight-btn');
            dialog.toggleHighlightIcon(constants.HIGHLIGHT_NORMAL_FILL_STYLE);
            expect(addHighlightBtn).to.not.have.class('highlight-active');
        });
    });

    describe('toggleHighlight()', () => {
        it('should delete a blank annotation if text is highlighted', () => {
            dialog.dialogEl.classList.add(constants.CLASS_ANNOTATION_TEXT_HIGHLIGHTED);
            dialog.toggleHighlight();
            expect(dialog.hasComments).to.be.true;
            expect(stubs.emit).to.be.calledWith('annotationdelete');
        });

        it('should create a blank annotation if text is not highlighted', () => {
            dialog.dialogEl.classList.remove(constants.CLASS_ANNOTATION_TEXT_HIGHLIGHTED);

            dialog.toggleHighlight();
            expect(dialog.dialogEl).to.have.class(constants.CLASS_ANNOTATION_TEXT_HIGHLIGHTED);
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
            const highlightLabelEl = dialog.element.querySelector('.bp-annotation-highlight-label');
            highlightLabelEl.innerHTML = 'Bob highlighted';
            dialog.element.style.width = '100px';

            const width = dialog.getDialogWidth();
            expect(width).to.equal(100);
        });

        it('should return previously set dialog width if already calculated', () => {
            dialog.element.style.width = '252px';
            const width = dialog.getDialogWidth();
            expect(width).to.equal(252); // Default comments dialog width
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
            const highlight = dialog.element.querySelector('.bp-annotation-highlight-dialog');
            const comment = document.querySelector('.annotation-comment');

            expect(comment).to.be.null;
            expect(highlight.dataset.annotationId).to.equal('1');
        });
    });
});
