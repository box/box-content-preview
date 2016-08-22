/* eslint-disable no-unused-expressions */
import ImagePointDialog from '../../image/image-point-dialog';
import * as annotatorUtil from '../../annotator-util';
import * as imageAnnotatorUtil from '../../image/image-annotator-util';

let pointDialog;
const sandbox = sinon.sandbox.create();

describe('image-point-dialog', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('annotations/__tests__/image/image-point-dialog-test.html');

        pointDialog = new ImagePointDialog({
            annotatedElement: document.querySelector('.annotated-element'),
            location: {},
            annotations: [],
            canAnnotate: true
        });

        pointDialog._element.style.width = '282px';
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    describe('position()', () => {
        it('should position the dialog at the right place and show it', () => {
            const annotationCaretEl = pointDialog._element.querySelector('.box-preview-annotation-caret');

            sandbox.stub(imageAnnotatorUtil, 'getBrowserCoordinatesFromLocation').returns([141, 2]);
            sandbox.stub(annotatorUtil, 'showElement');

            pointDialog.position();

            expect(imageAnnotatorUtil.getBrowserCoordinatesFromLocation).to.have.been.called;
            expect(annotatorUtil.showElement).to.have.been.called;
            assert.equal(annotationCaretEl.style.left, '50%'); // caret centered with dialog
        });

        it('should position the dialog on the left edge of the page and adjust caret location accordingly', () => {
            sandbox.stub(imageAnnotatorUtil, 'getBrowserCoordinatesFromLocation').returns([1, 2]);
            sandbox.stub(annotatorUtil, 'showElement');

            pointDialog.position();

            const annotationCaretEl = pointDialog._element.querySelector('.box-preview-annotation-caret');
            expect(imageAnnotatorUtil.getBrowserCoordinatesFromLocation).to.have.been.called;
            expect(annotatorUtil.showElement).to.have.been.called;
            assert.equal(pointDialog._element.style.left, '0px'); // dialog aligned to the left
            assert.equal(annotationCaretEl.style.left, '10px'); // caret aligned to the left
        });

        it('should position the dialog on the right edge of the page and adjust caret location accordingly', () => {
            sandbox.stub(imageAnnotatorUtil, 'getBrowserCoordinatesFromLocation').returns([400, 2]);
            sandbox.stub(annotatorUtil, 'showElement');

            pointDialog.position();

            const annotationCaretEl = pointDialog._element.querySelector('.box-preview-annotation-caret');
            expect(imageAnnotatorUtil.getBrowserCoordinatesFromLocation).to.have.been.called;
            expect(annotatorUtil.showElement).to.have.been.called;
            assert.equal(pointDialog._element.style.left, '118px'); // dialog aligned to the right
            assert.equal(annotationCaretEl.style.left, '272px'); // caret aligned to the right
        });
    });
});
