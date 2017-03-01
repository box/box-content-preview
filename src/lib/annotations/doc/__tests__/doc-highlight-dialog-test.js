/* eslint-disable no-unused-expressions */
import DocHighlightDialog from '../doc-highlight-dialog';
import Annotation from '../../annotation';
import AnnotationDialog from '../../annotation-dialog';
import * as annotatorUtil from '../../annotator-util';
import * as docAnnotatorUtil from '../doc-annotator-util';
import { CLASS_HIDDEN } from '../../../constants';
import * as constants from '../../annotation-constants';

let dialog;
const sandbox = sinon.sandbox.create();
let stubs = {};

const PAGE_PADDING_TOP = 15;

describe('doc-highlight-dialog', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('annotations/doc/__tests__/doc-highlight-dialog-test.html');

        dialog = new DocHighlightDialog({
            annotatedElement: document.querySelector('.annotated-element'),
            location: {
                page: 1
            },
            annotations: [],
            canAnnotate: true
        });
        dialog.setup([]);
        document.querySelector('.annotated-element').appendChild(dialog._element);

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
            dialog.addAnnotation(new Annotation({
                text: 'blargh',
                user: { id: 1, name: 'Bob' }
            }));
            expect(dialog.position).to.not.be.called;
        });

        it('should add a plain highlight annotation', () => {
            dialog.addAnnotation(new Annotation({
                text: '',
                user: { id: 1, name: 'Bob' }
            }));

            const highlightLabelEl = dialog._element.querySelector('.bp-annotation-highlight-label');
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
            dialog._hasComments = false;
            stubs.width.returns(100);
            stubs.caret.returns(10);

            dialog.position();

            expect(stubs.scaled).to.have.been.called;
            expect(stubs.width).to.have.been.called;
            expect(stubs.caret).to.have.been.called;
            expect(stubs.show).to.have.been.called;
            expect(dialog._element.style.left).to.equal('10px');
        });

        it('should position the highlight comments dialog at the right place and show it', () => {
            dialog._hasComments = true;
            stubs.caret.returns(10);

            dialog.position();

            expect(stubs.scaled).to.have.been.called;
            expect(stubs.width).to.have.been.called;
            expect(stubs.caret).to.have.been.called;
            expect(stubs.show).to.have.been.called;
            expect(dialog._element.style.left).to.equal('10px');
        });

        it('should adjust the dialog if the mouse location is above the page', () => {
            dialog._hasComments = false;
            stubs.scaled.returns([150, -1]);

            dialog.position();

            expect(stubs.scaled).to.have.been.called;
            expect(dialog._element.style.top).to.equal(`${PAGE_PADDING_TOP}px`);
        });

        it('should adjust the dialog if the dialog will run below the page', () => {
            dialog._hasComments = false;

            dialog.position();

            expect(stubs.scaled).to.have.been.called;
            expect(dialog._element.style.top).to.equal(`${PAGE_PADDING_TOP}px`);
        });
    });

    describe('toggleHighlightDialogs()', () => {
        it('should display comments dialog on toggle when comments dialog is currently hidden', () => {
            const commentsDialogEl = dialog._element.querySelector('.annotation-container');
            commentsDialogEl.classList.add(CLASS_HIDDEN);

            sandbox.stub(annotatorUtil, 'hideElement');
            sandbox.stub(dialog, 'position');

            dialog.toggleHighlightDialogs();

            expect(dialog._element).to.have.class(constants.CLASS_ANNOTATION_DIALOG);
            expect(dialog.position).to.have.been.called;
        });

        it('should display highlight buttons dialog on toggle when comments dialog is currently shown', () => {
            const commentsDialogEl = dialog._element.querySelector('.annotation-container');
            commentsDialogEl.classList.remove(CLASS_HIDDEN);

            sandbox.stub(annotatorUtil, 'hideElement');
            sandbox.stub(dialog, 'position');

            dialog.toggleHighlightDialogs();

            expect(dialog._element).to.not.have.class(constants.CLASS_ANNOTATION_DIALOG);
            expect(dialog.position).to.have.been.called;
        });
    });

    describe('toggleHighlightCommentsReply()', () => {
        it('should display "Reply" text area in dialog when multiple comments exist', () => {
            const replyTextEl = dialog._element.querySelector("[data-section='create']");
            const commentTextEl = dialog._element.querySelector("[data-section='show']");

            sandbox.stub(dialog, 'position');

            dialog.toggleHighlightCommentsReply(true);

            expect(commentTextEl).to.not.have.class(CLASS_HIDDEN);
            expect(replyTextEl).to.have.class(CLASS_HIDDEN);
        });

        it('should display "Add a comment here" text area in dialog when no comments exist', () => {
            const replyTextEl = dialog._element.querySelector("[data-section='create']");
            const commentTextEl = dialog._element.querySelector("[data-section='show']");

            sandbox.stub(dialog, 'position');

            dialog.toggleHighlightCommentsReply(false);

            expect(commentTextEl.classList.contains(CLASS_HIDDEN)).to.be.true;
            expect(replyTextEl.classList.contains(CLASS_HIDDEN)).to.be.false;
        });
    });

    describe('toggleHighlightIcon()', () => {
        it('should display active highlight icon when highlight is active', () => {
            const addHighlightBtn = dialog._element.querySelector('.bp-add-highlight-btn');
            dialog.toggleHighlightIcon(constants.HIGHLIGHT_ACTIVE_FILL_STYLE);
            expect(addHighlightBtn).to.have.class('highlight-active');
        });

        it('should display normal \'text highlighted\' highlight icon when highlight is not active', () => {
            const addHighlightBtn = dialog._element.querySelector('.bp-add-highlight-btn');
            dialog.toggleHighlightIcon(constants.HIGHLIGHT_NORMAL_FILL_STYLE);
            expect(addHighlightBtn).to.not.have.class('highlight-active');
        });
    });

    describe('toggleHighlight()', () => {
        it('should delete a blank annotation if text is highlighted', () => {
            dialog._element.classList.add(constants.CLASS_ANNOTATION_TEXT_HIGHLIGHTED);
            dialog.toggleHighlight();
            expect(dialog._hasComments).to.be.true;
            expect(stubs.emit).to.be.calledWith('annotationdelete');
        });

        it('should create a blank annotation if text is not highlighted', () => {
            dialog._element.classList.remove(constants.CLASS_ANNOTATION_TEXT_HIGHLIGHTED);

            dialog.toggleHighlight();
            expect(dialog._element).to.have.class(constants.CLASS_ANNOTATION_TEXT_HIGHLIGHTED);
            expect(dialog._hasComments).to.be.false;
            expect(stubs.emit).to.be.calledWith('annotationcreate');
        });
    });

    describe('focusAnnotationsTextArea()', () => {
        beforeEach(() => {
            stubs.textarea = {
                focus: () => {}
            };
            stubs.textMock = sandbox.mock(stubs.textarea);
            sandbox.stub(dialog._element, 'querySelector').returns(stubs.textarea);
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
            const highlightLabelEl = dialog._element.querySelector('.bp-annotation-highlight-label');
            highlightLabelEl.innerHTML = 'Bob highlighted';
            dialog._element.style.width = '100px';

            const width = dialog.getDialogWidth();
            expect(width).to.equal(100);
        });

        it('should return previously set dialog width if already calculated', () => {
            dialog._element.style.width = '252px';
            const width = dialog.getDialogWidth();
            expect(width).to.equal(252); // Default comments dialog width
        });
    });

    describe('getScaledPDFCoordinates()', () => {
        it('should lower right corner coordinates of dialog when a highlight does not have comments', () => {
            dialog._hasComments = false;

            sandbox.stub(annotatorUtil, 'getScale').returns(1);
            sandbox.stub(annotatorUtil, 'getDimensionScale');
            stubs.corner = sandbox.stub(docAnnotatorUtil, 'getLowerRightCornerOfLastQuadPoint').returns([200, 2]);

            dialog.getScaledPDFCoordinates({}, 100);

            expect(stubs.corner).to.have.been.called;
        });
    });

    describe('addAnnotationElement()', () => {
        it('should not add a comment if the text is blank', () => {
            dialog.addAnnotationElement(new Annotation({
                annotationID: 1,
                text: '',
                user: {},
                permissions: {}
            }));
            const highlight = dialog._element.querySelector('.bp-annotation-highlight-dialog');
            const comment = document.querySelector('.annotation-comment');

            expect(comment).to.be.null;
            expect(highlight.dataset.annotationId).to.equal('1');
        });
    });
});
