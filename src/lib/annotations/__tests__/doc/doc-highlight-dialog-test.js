/* eslint-disable no-unused-expressions */
import DocHighlightDialog from '../../doc/doc-highlight-dialog';
import * as annotatorUtil from '../../annotator-util';
import * as docAnnotatorUtil from '../../doc/doc-annotator-util';
import { CLASS_HIDDEN } from '../../../constants';
import * as constants from '../../annotation-constants';

let highlightDialog;
const sandbox = sinon.sandbox.create();

const CLASS_HIGHLIGHT_DIALOG = 'box-preview-highlight-dialog';

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
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    describe('addAnnotation()', () => {
        it('should add a highlight comment annotation', () => {
            highlightDialog.addAnnotation({});

            expect(highlightDialog._hasAnnotations).to.be.true;
        });

        it('should add a plain highlight annotation', () => {
            // This stubs out a parent method by forcing the method we care about
            // in the prototype of the prototype of DocHighlightThread (ie
            // AnnotationThread's prototype) to be a stub
            Object.defineProperty(Object.getPrototypeOf(DocHighlightDialog.prototype), 'addAnnotation', {
                value: sandbox.stub()
            });

            highlightDialog.addAnnotation();

            expect(highlightDialog._hasAnnotations).to.be.false;
            expect(highlightDialog._element.classList.contains(constants.CLASS_ANNOTATION_TEXT_HIGHLIGHTED)).to.be.true;
        });
    });

    describe('getDimensions()', () => {
        it('should return dialog dimensions', () => {
            sandbox.stub(highlightDialog._element, 'getBoundingClientRect');
            highlightDialog.getDimensions();

            expect(highlightDialog._element.getBoundingClientRect).to.have.been.called;
        });
    });

    describe('position()', () => {
        describe('highlight', () => {
            it('should position the dialog at the right place and show it', () => {
                highlightDialog._hasComments = false;
                highlightDialog._element.style.width = '81px';

                sandbox.stub(docAnnotatorUtil, 'getLowerRightCornerOfLastQuadPoint').returns([141, 2]);
                sandbox.stub(annotatorUtil, 'showElement');

                highlightDialog.position();

                const annotationCaretEl = highlightDialog._element.querySelector('.box-preview-annotation-caret');
                expect(docAnnotatorUtil.getLowerRightCornerOfLastQuadPoint).to.have.been.called;
                expect(annotatorUtil.showElement).to.have.been.called;
                assert.equal(annotationCaretEl.style.left, '50%'); // caret centered with dialog
            });

            it('should position the dialog on the left edge of the page and adjust caret location accordingly', () => {
                highlightDialog._hasComments = false;
                highlightDialog._element.style.width = '81px';

                sandbox.stub(docAnnotatorUtil, 'getLowerRightCornerOfLastQuadPoint').returns([1, 2]);
                sandbox.stub(annotatorUtil, 'showElement');

                highlightDialog.position();

                const annotationCaretEl = highlightDialog._element.querySelector('.box-preview-annotation-caret');
                expect(docAnnotatorUtil.getLowerRightCornerOfLastQuadPoint).to.have.been.called;
                expect(annotatorUtil.showElement).to.have.been.called;
                assert.equal(highlightDialog._element.style.left, '0px'); // dialog aligned to the left
                assert.equal(annotationCaretEl.style.left, '10px'); // caret aligned to the left
            });

            it('should position the dialog on the right edge of the page and adjust caret location accordingly', () => {
                highlightDialog._hasComments = false;
                highlightDialog._element.style.width = '81px';

                sandbox.stub(docAnnotatorUtil, 'getLowerRightCornerOfLastQuadPoint').returns([400, 2]);
                sandbox.stub(annotatorUtil, 'showElement');

                highlightDialog.position();

                const annotationCaretEl = highlightDialog._element.querySelector('.box-preview-annotation-caret');
                expect(docAnnotatorUtil.getLowerRightCornerOfLastQuadPoint).to.have.been.called;
                expect(annotatorUtil.showElement).to.have.been.called;

                // pageWidth === 384px
                assert.equal(highlightDialog._element.style.left, '303px'); // dialog aligned to the right
                assert.equal(annotationCaretEl.style.left, '71px'); // caret aligned to the right
            });
        });

        describe('highlight-comment', () => {
            it('should position the dialog at the right place and show it', () => {
                highlightDialog._hasComments = true;
                highlightDialog._element.style.width = '282px';

                sandbox.stub(docAnnotatorUtil, 'getLowerCenterPoint').returns([141, 2]);
                sandbox.stub(annotatorUtil, 'showElement');

                highlightDialog.position();

                const annotationCaretEl = highlightDialog._element.querySelector('.box-preview-annotation-caret');
                expect(docAnnotatorUtil.getLowerCenterPoint).to.have.been.called;
                expect(annotatorUtil.showElement).to.have.been.called;
                assert.equal(annotationCaretEl.style.left, '50%'); // caret centered with dialog
            });

            it('should position the dialog on the left edge of the page and adjust caret location accordingly', () => {
                highlightDialog._hasComments = true;
                highlightDialog._element.style.width = '282px';

                sandbox.stub(docAnnotatorUtil, 'getLowerCenterPoint').returns([1, 2]);
                sandbox.stub(annotatorUtil, 'showElement');

                highlightDialog.position();

                const annotationCaretEl = highlightDialog._element.querySelector('.box-preview-annotation-caret');
                expect(docAnnotatorUtil.getLowerCenterPoint).to.have.been.called;
                expect(annotatorUtil.showElement).to.have.been.called;
                assert.equal(highlightDialog._element.style.left, '0px'); // dialog aligned to the left
                assert.equal(annotationCaretEl.style.left, '10px'); // caret aligned to the left
            });

            it('should position the dialog on the right edge of the page and adjust caret location accordingly', () => {
                highlightDialog._hasComments = true;
                highlightDialog._element.style.width = '282px';

                sandbox.stub(docAnnotatorUtil, 'getLowerCenterPoint').returns([400, 2]);
                sandbox.stub(annotatorUtil, 'showElement');

                highlightDialog.position();

                const annotationCaretEl = highlightDialog._element.querySelector('.box-preview-annotation-caret');
                expect(docAnnotatorUtil.getLowerCenterPoint).to.have.been.called;
                expect(annotatorUtil.showElement).to.have.been.called;

                // pageWidth === 384px
                assert.equal(highlightDialog._element.style.left, '102px'); // dialog aligned to the right
                assert.equal(annotationCaretEl.style.left, '272px'); // caret aligned to the right
            });
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

    describe('_toggleHighlight()', () => {
        it('should delete a blank annotation if text is highlighted', () => {
            const emitStub = sandbox.stub(highlightDialog, 'emit');
            highlightDialog._element.classList.add(constants.CLASS_ANNOTATION_TEXT_HIGHLIGHTED);

            highlightDialog._toggleHighlight();
            expect(highlightDialog._element.classList.contains(constants.CLASS_ANNOTATION_TEXT_HIGHLIGHTED)).to.be.false;
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
});
