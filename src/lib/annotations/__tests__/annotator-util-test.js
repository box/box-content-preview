/* eslint-disable no-unused-expressions */
import {
    findClosestElWithClass,
    findClosestDataType,
    showElement,
    hideElement,
    showInvisibleElement,
    hideElementVisibility,
    resetTextarea,
    isElementInViewport,
    getAvatarHtml,
    getScale,
    isPlainHighlight,
    isHighlightAnnotation,
    htmlEscape,
    repositionCaret
} from '../annotator-util';
import * as constants from '../annotation-constants';

const DIALOG_WIDTH = 81;

describe('annotator-util', () => {
    let childEl;
    let parentEl;

    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('annotations/__tests__/annotator-util-test.html');

        childEl = document.querySelector('.child');
        parentEl = document.querySelector('.parent');
    });

    afterEach(() => {
        fixture.cleanup();
    });

    describe('findClosestElWithClass()', () => {
        it('should return closest ancestor element with the specified class', () => {
            assert.equal(findClosestElWithClass(childEl, 'parent'), parentEl);
        });

        it('should return null if no matching ancestor is found', () => {
            assert.equal(findClosestElWithClass(childEl, 'otherParent'), null);
        });
    });

    describe('findClosestDataType()', () => {
        it('should return the data type of the closest ancestor with a data type when no attributeName is provided', () => {
            assert.equal(findClosestDataType(childEl), 'someType');
        });

        it('should return the attribute name of the closest ancestor with the specified attributeName', () => {
            assert.equal(findClosestDataType(childEl, 'data-name'), 'someName');
        });

        it('should return empty string if no matching ancestor is found', () => {
            assert.equal(findClosestDataType(childEl, 'data-foo'), '');
        });
    });

    describe('showElement()', () => {
        it('should remove hidden class from element with matching selector', () => {
            // Hide element before testing show function
            childEl.classList.add('box-preview-is-hidden');
            showElement('.child');
            assert.ok(!childEl.classList.contains('box-preview-is-hidden'));
        });

        it('should remove hidden class from provided element', () => {
            // Hide element before testing show function
            childEl.classList.add('box-preview-is-hidden');
            showElement(childEl);
            assert.ok(!childEl.classList.contains('box-preview-is-hidden'));
        });
    });

    describe('hideElement()', () => {
        it('should add hidden class to matching element', () => {
            hideElement('.child');
            assert.ok(childEl.classList.contains('box-preview-is-hidden'));
        });

        it('should add hidden class to provided element', () => {
            hideElement(childEl);
            assert.ok(childEl.classList.contains('box-preview-is-hidden'));
        });
    });

    describe('showInvisibleElement()', () => {
        it('should remove invisible class from element with matching selector', () => {
            // Hide element before testing show function
            childEl.classList.add('box-preview-is-invisible');
            showInvisibleElement('.child');
            expect(childEl.classList.contains('box-preview-is-invisible')).to.be.false;
        });

        it('should remove invisible class from provided element', () => {
            // Hide element before testing show function
            childEl.classList.add('box-preview-is-invisible');
            showInvisibleElement(childEl);
            expect(childEl.classList.contains('box-preview-is-invisible')).to.be.false;
        });
    });

    describe('hideElementVisibility()', () => {
        it('should add invisible class to matching element', () => {
            hideElementVisibility('.child');
            expect(childEl.classList.contains('box-preview-is-invisible')).to.be.true;
        });

        it('should add invisible class to provided element', () => {
            hideElementVisibility(childEl);
            expect(childEl.classList.contains('box-preview-is-invisible')).to.be.true;
        });
    });

    describe('resetTextarea()', () => {
        it('should reset text area', () => {
            const textAreaEl = document.querySelector('.textarea');

            // Fake making text area 'active'
            textAreaEl.classList.add('box-preview-is-active');
            textAreaEl.value = 'test';
            textAreaEl.style.width = '10px';
            textAreaEl.style.height = '10px';

            resetTextarea(textAreaEl);

            assert.ok(!textAreaEl.classList.contains('box-preview-is-active'), 'Should be inactive');
            assert.equal(textAreaEl.value, 'test', 'Value should NOT be reset');
            assert.equal(textAreaEl.style.width, '', 'Width should be reset');
            assert.equal(textAreaEl.style.height, '', 'Height should be reset');
        });

        it('should reset text area', () => {
            const textAreaEl = document.querySelector('.textarea');

            // Fake making text area 'active'
            textAreaEl.classList.add('box-preview-is-active');
            textAreaEl.value = 'test';
            textAreaEl.style.width = '10px';
            textAreaEl.style.height = '10px';

            resetTextarea(textAreaEl, true);

            assert.ok(!textAreaEl.classList.contains('box-preview-is-active'), 'Should be inactive');
            assert.equal(textAreaEl.value, '', 'Value should be reset');
            assert.equal(textAreaEl.style.width, '', 'Width should be reset');
            assert.equal(textAreaEl.style.height, '', 'Height should be reset');
        });
    });

    describe('isElementInViewport()', () => {
        it('should return true for an element fully in the viewport', () => {
            assert.ok(isElementInViewport(childEl));
        });

        it('should return false for an element not fully in the viewport', () => {
            // Fake child element not being in viewport
            childEl.style.position = 'absolute';
            childEl.style.left = '-10px';
            assert.ok(!isElementInViewport(childEl));
        });
    });

    describe('getAvatarHtml()', () => {
        it('should return avatar HTML with img if avatarUrl is provided', () => {
            const expectedHtml = '<img src="https://example.com" alt="Avatar">';
            assert.equal(getAvatarHtml('https://example.com', '1', 'Some Name'), expectedHtml);
        });

        it('should return avatar HTML initials if no avatarUrl is provided', () => {
            const expectedHtml = '<div class="box-preview-annotation-profile avatar-color-1">SN</div>'.trim();
            assert.equal(getAvatarHtml('', '1', 'Some Name'), expectedHtml);
        });
    });

    describe('getScale()', () => {
        it('should return the zoom scale stored in the data-zoom attribute for the element', () => {
            childEl.setAttribute('data-scale', 3);
            assert.equal(getScale(childEl), 3);
        });

        it('should return a zoom scale of 1 if no stored zoom is found on the element', () => {
            assert.equal(getScale(childEl), 1);
        });
    });

    describe('isPlainHighlight()', () => {
        it('should return true if highlight annotation is a plain highlight', () => {
            const annotations = [{ text: '' }];

            expect(isPlainHighlight(annotations)).to.be.true;
        });

        it('should return false if a plain highlight annotation had comments added to it', () => {
            const annotations = [{ text: '' }, { text: 'bleh' }];

            expect(isPlainHighlight(annotations)).to.be.false;
        });

        it('should return false if highlight annotation has comments', () => {
            const annotations = [{ text: 'bleh' }];

            expect(isPlainHighlight(annotations)).to.be.false;
        });
    });

    describe('isHighlightAnnotation()', () => {
        it('should return true if annotation is a plain highlight annotation', () => {
            assert.ok(isHighlightAnnotation(constants.ANNOTATION_TYPE_HIGHLIGHT));
        });

        it('should return true if annotation is a highlight comment annotation', () => {
            assert.ok(isHighlightAnnotation(constants.ANNOTATION_TYPE_HIGHLIGHT_COMMENT));
        });

        it('should return false if annotation is a point annotation', () => {
            assert.ok(!isHighlightAnnotation(constants.ANNOTATION_TYPE_POINT));
        });
    });

    describe('htmlEscape()', () => {
        it('should return HTML-escaped text', () => {
            assert.equal(htmlEscape('test&file=what'), 'test&amp;file=what', 'Should escape and symbol');
            assert.equal(htmlEscape('<script>'), '&lt;script&gt;', 'Should escape brackets');
            assert.equal(htmlEscape('"string"'), '&quot;string&quot;', 'Should escape double quote');
            assert.equal(htmlEscape('\'string\''), '&#39;string&#39;', 'Should escape single quote');
            assert.equal(htmlEscape('`string`'), '&#96;string&#96;', 'Should escape back tick');
        });
    });

    describe('repositionCaret()', () => {
        it('should position the dialog on the left edge of the page and adjust caret location accordingly', () => {
            const browserX = 1;
            const pageWidth = 100;
            const initX = browserX - (DIALOG_WIDTH / 2);
            const dialogEl = document.querySelector('.box-preview-annotation-dialog');

            const dialogX = repositionCaret(dialogEl, initX, DIALOG_WIDTH, browserX, pageWidth);

            const annotationCaretEl = dialogEl.querySelector('.box-preview-annotation-caret');
            expect(dialogX).to.equal(0); // dialog aligned to the left
            expect(annotationCaretEl.style.left).to.equal('10px'); // caret aligned to the left
        });

        it('should position the dialog on the right edge of the page and adjust caret location accordingly', () => {
            const browserX = 400;
            const pageWidth = 100;
            const initX = browserX - (DIALOG_WIDTH / 2);
            const dialogEl = document.querySelector('.box-preview-annotation-dialog');

            const dialogX = repositionCaret(dialogEl, initX, DIALOG_WIDTH, browserX, pageWidth);

            const annotationCaretEl = dialogEl.querySelector('.box-preview-annotation-caret');
            expect(dialogX).to.equal(19); // dialog aligned to the right
            expect(annotationCaretEl.style.left).to.equal('71px'); // caret aligned to the right
        });

        it('should position the caret in the center of the dialog and return top left corner coordinate', () => {
            const browserX = 100;
            const pageWidth = 1000;
            const initX = browserX - (DIALOG_WIDTH / 2);
            const dialogEl = document.querySelector('.box-preview-annotation-dialog');

            const dialogX = repositionCaret(dialogEl, initX, DIALOG_WIDTH, browserX, pageWidth);

            const annotationCaretEl = dialogEl.querySelector('.box-preview-annotation-caret');
            expect(dialogX).to.equal(initX); // dialog x unchanged
            expect(annotationCaretEl.style.left).to.equal('50%'); // caret centered with dialog
        });
    });
});
