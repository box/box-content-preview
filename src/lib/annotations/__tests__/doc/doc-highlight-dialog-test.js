/* eslint-disable no-unused-expressions */
import DocHighlightDialog from '../../doc/doc-highlight-dialog';
import * as annotatorUtil from '../../annotator-util';
import * as docAnnotatorUtil from '../../doc/doc-annotator-util';
import { CLASS_HIDDEN } from '../../../constants';
import * as constants from '../../annotation-constants';

let highlightDialog;
const sandbox = sinon.sandbox.create();

const CLASS_HIGHLIGHT_DIALOG = 'box-preview-highlight-dialog';
const HIGHLIGHT_BUTTONS_DIALOG_WIDTH = 81;
const PAGE_PADDING_TOP = 15;

describe('doc-highlight-dialog', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('annotations/__tests__/doc/doc-highlight-dialog-test.html');

        highlightDialog = new DocHighlightDialog({
            annotatedElement: document.querySelector('.annotated-element'),
            location: {
                page: 1
            },
            annotations: [],
            canAnnotate: true
        });
        document.querySelector('.annotated-element').appendChild(highlightDialog._element);
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    describe('addAnnotation()', () => {
        it('should add a highlight comment annotation', () => {
            sandbox.stub(highlightDialog, 'position');

            highlightDialog.addAnnotation({});

            expect(highlightDialog._hasAnnotations).to.be.true;
        });

        it('should add a plain highlight annotation', () => {
            sandbox.stub(highlightDialog, 'position');

            highlightDialog.addAnnotation({
                text: '',
                user: {
                    name: 'Bob'
                }
            });

            const highlightLabelEl = highlightDialog._element.querySelector('.box-preview-annotation-highlight-label');
            expect(highlightLabelEl.innerHTML).to.equal('Bob highlighted');
            expect(highlightDialog._hasAnnotations).to.be.true;
        });
    });

    describe('position()', () => {
        it('should position the plain highlight dialog at the right place and show it', () => {
            highlightDialog._hasComments = false;

            sandbox.stub(highlightDialog, '_getScaledPDFCoordinates').returns([150, 2]);
            sandbox.stub(highlightDialog, '_getDialogWidth').returns(100);
            sandbox.stub(highlightDialog, '_repositionCaret').returns(10);
            sandbox.stub(annotatorUtil, 'showElement');
            sandbox.stub(docAnnotatorUtil, 'isPresentation').returns(false);

            highlightDialog.position();

            expect(highlightDialog._getScaledPDFCoordinates).to.have.been.called;
            expect(highlightDialog._getDialogWidth).to.have.been.called;
            expect(highlightDialog._repositionCaret).to.have.been.called;
            expect(annotatorUtil.showElement).to.have.been.called;
            expect(highlightDialog._element.style.left).to.equal('10px');
        });

        it('should position the highlight comments dialog at the right place and show it', () => {
            highlightDialog._hasComments = true;

            sandbox.stub(highlightDialog, '_getScaledPDFCoordinates').returns([150, 2]);
            sandbox.stub(highlightDialog, '_getDialogWidth');
            sandbox.stub(highlightDialog, '_repositionCaret').returns(10);
            sandbox.stub(annotatorUtil, 'showElement');
            sandbox.stub(docAnnotatorUtil, 'isPresentation').returns(false);

            highlightDialog.position();

            expect(highlightDialog._getScaledPDFCoordinates).to.have.been.called;
            expect(highlightDialog._getDialogWidth).to.have.been.called;
            expect(highlightDialog._repositionCaret).to.have.been.called;
            expect(annotatorUtil.showElement).to.have.been.called;
            expect(highlightDialog._element.style.left).to.equal('10px');
        });

        it('should adjust the dialog if the mouse location is above the page', () => {
            highlightDialog._hasComments = false;

            sandbox.stub(highlightDialog, '_getScaledPDFCoordinates').returns([150, -1]);
            sandbox.stub(highlightDialog, '_getDialogWidth');
            sandbox.stub(highlightDialog, '_repositionCaret');
            sandbox.stub(annotatorUtil, 'showElement');
            sandbox.stub(docAnnotatorUtil, 'isPresentation').returns(false);

            highlightDialog.position();

            expect(highlightDialog._getScaledPDFCoordinates).to.have.been.called;
            expect(highlightDialog._element.style.top).to.equal(`${PAGE_PADDING_TOP}px`);
        });

        it('should adjust the dialog if the dialog will run below the page', () => {
            highlightDialog._hasComments = false;

            sandbox.stub(highlightDialog, '_getScaledPDFCoordinates').returns([150, 2]);
            sandbox.stub(highlightDialog, '_getDialogWidth');
            sandbox.stub(highlightDialog, '_repositionCaret');
            sandbox.stub(annotatorUtil, 'showElement');
            sandbox.stub(docAnnotatorUtil, 'isPresentation').returns(false);

            highlightDialog.position();

            expect(highlightDialog._getScaledPDFCoordinates).to.have.been.called;

            expect(highlightDialog._element.style.top).to.equal(`${PAGE_PADDING_TOP}px`);
        });

        it('should allow scrolling on annotations dialog if file is a powerpoint', () => {
            highlightDialog._hasComments = false;

            sandbox.stub(highlightDialog, '_getScaledPDFCoordinates').returns([150, 2]);
            sandbox.stub(highlightDialog, '_getDialogWidth').returns(100);
            sandbox.stub(highlightDialog, '_repositionCaret').returns(10);
            sandbox.stub(annotatorUtil, 'showElement');
            sandbox.stub(docAnnotatorUtil, 'isPresentation').returns(true);

            highlightDialog.position();

            const annotationsEl = highlightDialog._element.querySelector('.annotation-container');
            expect(annotationsEl.style.maxHeight).to.not.be.undefined;
            expect(annotationsEl.style.overflow).to.equal('scroll');
        });
    });

    describe('toggleHighlightDialogs()', () => {
        it('should display comments dialog on toggle when comments dialog is currently hidden', () => {
            const commentsDialogEl = highlightDialog._element.querySelector('.annotation-container');
            commentsDialogEl.classList.add(CLASS_HIDDEN);

            sandbox.stub(annotatorUtil, 'hideElement');
            sandbox.stub(highlightDialog, 'position');

            highlightDialog.toggleHighlightDialogs();

            expect(highlightDialog._element.classList.contains(constants.CLASS_ANNOTATION_DIALOG)).to.be.true;
            expect(highlightDialog.position).to.have.been.called;
        });

        it('should display highlight buttons dialog on toggle when comments dialog is currently shown', () => {
            const commentsDialogEl = highlightDialog._element.querySelector('.annotation-container');
            commentsDialogEl.classList.remove(CLASS_HIDDEN);

            sandbox.stub(annotatorUtil, 'hideElement');
            sandbox.stub(highlightDialog, 'position');

            highlightDialog.toggleHighlightDialogs();

            expect(highlightDialog._element.classList.contains(CLASS_HIGHLIGHT_DIALOG)).to.be.true;
            expect(highlightDialog.position).to.have.been.called;
        });
    });

    describe('toggleHighlightCommentsReply()', () => {
        it('should display "Reply" text area in dialog when multiple comments exist', () => {
            const replyTextEl = highlightDialog._element.querySelector("[data-section='create']");
            const commentTextEl = highlightDialog._element.querySelector("[data-section='show']");

            sandbox.stub(highlightDialog, 'position');

            highlightDialog.toggleHighlightCommentsReply(true);

            expect(commentTextEl.classList.contains(CLASS_HIDDEN)).to.be.false;
            expect(replyTextEl.classList.contains(CLASS_HIDDEN)).to.be.true;
        });

        it('should display "Add a comment here" text area in dialog when no comments exist', () => {
            const replyTextEl = highlightDialog._element.querySelector("[data-section='create']");
            const commentTextEl = highlightDialog._element.querySelector("[data-section='show']");

            sandbox.stub(highlightDialog, 'position');

            highlightDialog.toggleHighlightCommentsReply(false);

            expect(commentTextEl.classList.contains(CLASS_HIDDEN)).to.be.true;
            expect(replyTextEl.classList.contains(CLASS_HIDDEN)).to.be.false;
        });
    });

    describe('toggleHighlightIcon()', () => {
        it('should display active highlight icon when highlight is active', () => {
            const addHighlightBtn = highlightDialog._element.querySelector('.box-preview-add-highlight-btn');

            highlightDialog.toggleHighlightIcon(constants.HIGHLIGHT_ACTIVE_FILL_STYLE);

            expect(addHighlightBtn.classList.contains('highlight-active')).to.be.true;
        });

        it('should display normal \'text highlighted\' highlight icon when highlight is not active', () => {
            const addHighlightBtn = highlightDialog._element.querySelector('.box-preview-add-highlight-btn');

            highlightDialog.toggleHighlightIcon(constants.HIGHLIGHT_NORMAL_FILL_STYLE);

            expect(addHighlightBtn.classList.contains('highlight-active')).to.be.false;
        });
    });

    describe('_toggleHighlight()', () => {
        it('should delete a blank annotation if text is highlighted', () => {
            const emitStub = sandbox.stub(highlightDialog, 'emit');
            highlightDialog._element.classList.add(constants.CLASS_ANNOTATION_TEXT_HIGHLIGHTED);

            highlightDialog._toggleHighlight();
            expect(highlightDialog._hasComments).to.be.true;
            expect(emitStub).to.be.calledWith('annotationdelete');
        });

        it('should create a blank annotation if text is not highlighted', () => {
            const emitStub = sandbox.stub(highlightDialog, 'emit');
            highlightDialog._element.classList.remove(constants.CLASS_ANNOTATION_TEXT_HIGHLIGHTED);

            highlightDialog._toggleHighlight();
            expect(highlightDialog._element.classList.contains(constants.CLASS_ANNOTATION_TEXT_HIGHLIGHTED)).to.be.true;
            expect(highlightDialog._hasComments).to.be.false;
            expect(emitStub).to.be.calledWith('annotationcreate');
        });
    });

    describe('_focusAnnotationsTextArea()', () => {
        it('should focus the add comment area if it exists', () => {
            const textarea = {
                focus: sandbox.stub()
            };
            const querySelectorStub = sandbox.stub(highlightDialog._element, 'querySelector').returns(textarea);
            const isInViewportStub = sandbox.stub(annotatorUtil, 'isElementInViewport').returns(true);

            highlightDialog._focusAnnotationsTextArea();
            expect(querySelectorStub).to.be.called;
            expect(isInViewportStub).to.be.called;
            expect(textarea.focus).to.be.called;
        });

        it('should do nothing if the add comment area does not exist', () => {
            const textarea = {
                focus: sandbox.stub()
            };
            const querySelectorStub = sandbox.stub(highlightDialog._element, 'querySelector').returns(textarea);
            const isInViewportStub = sandbox.stub(annotatorUtil, 'isElementInViewport').returns(false);

            highlightDialog._focusAnnotationsTextArea();
            expect(querySelectorStub).to.be.called;
            expect(isInViewportStub).to.be.called;
            expect(textarea.focus).to.not.be.called;
        });
    });

    describe('_getDialogWidth', () => {
        it('should calculate dialog width once annotator\'s user name has been populated', () => {
            const highlightLabelEl = highlightDialog._element.querySelector('.box-preview-annotation-highlight-label');
            highlightLabelEl.innerHTML = 'Bob highlighted';
            highlightDialog._element.style.width = '100px';

            const width = highlightDialog._getDialogWidth();

            expect(width).to.equal(100);
        });

        it('should return previously set dialog width if already calculated', () => {
            highlightDialog._element.style.width = '252px';

            const width = highlightDialog._getDialogWidth();

            expect(width).to.equal(252); // Default comments dialog width
        });
    });

    describe('_repositionCaret()', () => {
        it('should position the dialog on the left edge of the page and adjust caret location accordingly', () => {
            const browserX = 1;
            const pageWidth = 100;
            const initX = browserX - (HIGHLIGHT_BUTTONS_DIALOG_WIDTH / 2);

            const dialogX = highlightDialog._repositionCaret(initX, HIGHLIGHT_BUTTONS_DIALOG_WIDTH, browserX, pageWidth);

            const annotationCaretEl = highlightDialog._element.querySelector('.box-preview-annotation-caret');
            expect(dialogX).to.equal(0); // dialog aligned to the left
            expect(annotationCaretEl.style.left).to.equal('10px'); // caret aligned to the left
        });

        it('should position the dialog on the right edge of the page and adjust caret location accordingly', () => {
            const browserX = 400;
            const pageWidth = 100;
            const initX = browserX - (HIGHLIGHT_BUTTONS_DIALOG_WIDTH / 2);

            const dialogX = highlightDialog._repositionCaret(initX, HIGHLIGHT_BUTTONS_DIALOG_WIDTH, browserX, pageWidth);

            const annotationCaretEl = highlightDialog._element.querySelector('.box-preview-annotation-caret');
            expect(dialogX).to.equal(19); // dialog aligned to the right
            expect(annotationCaretEl.style.left).to.equal('71px'); // caret aligned to the right
        });

        it('should position the caret in the center of the dialog and return top left corner coordinate', () => {
            const browserX = 100;
            const pageWidth = 1000;
            const initX = browserX - (HIGHLIGHT_BUTTONS_DIALOG_WIDTH / 2);

            const dialogX = highlightDialog._repositionCaret(initX, HIGHLIGHT_BUTTONS_DIALOG_WIDTH, browserX, pageWidth);

            const annotationCaretEl = highlightDialog._element.querySelector('.box-preview-annotation-caret');
            expect(dialogX).to.equal(initX); // dialog x unchanged
            expect(annotationCaretEl.style.left).to.equal('50%'); // caret centered with dialog
        });
    });

    describe('_getScaledPDFCoordinates()', () => {
        it('should lower right corner coordinates of dialog when a highlight does not have comments', () => {
            highlightDialog._hasComments = false;

            sandbox.stub(annotatorUtil, 'getScale').returns(1);
            sandbox.stub(docAnnotatorUtil, 'getLowerRightCornerOfLastQuadPoint').returns([200, 2]);
            sandbox.stub(docAnnotatorUtil, 'getDimensionScale');

            highlightDialog._getScaledPDFCoordinates({}, 100);

            expect(docAnnotatorUtil.getLowerRightCornerOfLastQuadPoint).to.have.been.called;
        });
    });
});
