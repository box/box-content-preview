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
    getDimensionScale,
    htmlEscape,
    repositionCaret,
    isPending
} from '../annotatorUtil';
import * as constants from '../annotationConstants';

const DIALOG_WIDTH = 81;

describe('lib/annotations/annotatorUtil', () => {
    let childEl;
    let parentEl;

    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('annotations/__tests__/annotatorUtil-test.html');

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
            childEl.classList.add('bp-is-hidden');
            showElement('.child');
            assert.ok(!childEl.classList.contains('bp-is-hidden'));
        });

        it('should remove hidden class from provided element', () => {
            // Hide element before testing show function
            childEl.classList.add('bp-is-hidden');
            showElement(childEl);
            assert.ok(!childEl.classList.contains('bp-is-hidden'));
        });
    });

    describe('hideElement()', () => {
        it('should add hidden class to matching element', () => {
            hideElement('.child');
            assert.ok(childEl.classList.contains('bp-is-hidden'));
        });

        it('should add hidden class to provided element', () => {
            hideElement(childEl);
            assert.ok(childEl.classList.contains('bp-is-hidden'));
        });
    });

    describe('showInvisibleElement()', () => {
        it('should remove invisible class from element with matching selector', () => {
            // Hide element before testing show function
            childEl.classList.add('bp-is-invisible');
            showInvisibleElement('.child');
            expect(childEl.classList.contains('bp-is-invisible')).to.be.false;
        });

        it('should remove invisible class from provided element', () => {
            // Hide element before testing show function
            childEl.classList.add('bp-is-invisible');
            showInvisibleElement(childEl);
            expect(childEl.classList.contains('bp-is-invisible')).to.be.false;
        });
    });

    describe('hideElementVisibility()', () => {
        it('should add invisible class to matching element', () => {
            hideElementVisibility('.child');
            expect(childEl.classList.contains('bp-is-invisible')).to.be.true;
        });

        it('should add invisible class to provided element', () => {
            hideElementVisibility(childEl);
            expect(childEl.classList.contains('bp-is-invisible')).to.be.true;
        });
    });

    describe('resetTextarea()', () => {
        it('should reset text area', () => {
            const textAreaEl = document.querySelector('.textarea');

            // Fake making text area 'active'
            textAreaEl.classList.add('bp-is-active');
            textAreaEl.value = 'test';
            textAreaEl.style.width = '10px';
            textAreaEl.style.height = '10px';

            resetTextarea(textAreaEl);

            assert.ok(!textAreaEl.classList.contains('bp-is-active'), 'Should be inactive');
            assert.equal(textAreaEl.value, 'test', 'Value should NOT be reset');
            assert.equal(textAreaEl.style.width, '', 'Width should be reset');
            assert.equal(textAreaEl.style.height, '', 'Height should be reset');
        });

        it('should reset text area', () => {
            const textAreaEl = document.querySelector('.textarea');

            // Fake making text area 'active'
            textAreaEl.classList.add('bp-is-active');
            textAreaEl.value = 'test';
            textAreaEl.style.width = '10px';
            textAreaEl.style.height = '10px';

            resetTextarea(textAreaEl, true);

            assert.ok(!textAreaEl.classList.contains('bp-is-active'), 'Should be inactive');
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
            const expectedHtml = '<div class="bp-annotation-profile avatar-color-1">SN</div>'.trim();
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

    describe('getDimensionScale()', () => {
        it('should return null if no dimension scaling is needed', () => {
            const dimensions = {
                x: 100,
                y: 100
            };
            const pageDimensions = {
                width: 100,
                height: 130
            };

            const HEIGHT_PADDING = 30;
            const result = getDimensionScale(dimensions, pageDimensions, 1, HEIGHT_PADDING);
            expect(result).to.be.null;
        });

        it('should return dimension scaling factor if dimension scaling is needed', () => {
            const dimensions = {
                x: 100,
                y: 100
            };
            const pageDimensions = {
                width: 200,
                height: 230
            };

            const HEIGHT_PADDING = 30;
            const result = getDimensionScale(dimensions, pageDimensions, 1, HEIGHT_PADDING);
            expect(result.x).to.equal(2);
            expect(result.y).to.equal(2);
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
            const dialogEl = document.querySelector('.bp-annotation-dialog');

            const dialogX = repositionCaret(dialogEl, initX, DIALOG_WIDTH, browserX, pageWidth);

            const annotationCaretEl = dialogEl.querySelector('.bp-annotation-caret');
            expect(dialogX).to.equal(0); // dialog aligned to the left
            expect(annotationCaretEl.style.left).to.equal('10px'); // caret aligned to the left
        });

        it('should position the dialog on the right edge of the page and adjust caret location accordingly', () => {
            const browserX = 400;
            const pageWidth = 100;
            const initX = browserX - (DIALOG_WIDTH / 2);
            const dialogEl = document.querySelector('.bp-annotation-dialog');

            const dialogX = repositionCaret(dialogEl, initX, DIALOG_WIDTH, browserX, pageWidth);

            const annotationCaretEl = dialogEl.querySelector('.bp-annotation-caret');
            expect(dialogX).to.equal(19); // dialog aligned to the right
            expect(annotationCaretEl.style.left).to.equal('71px'); // caret aligned to the right
        });

        it('should position the caret in the center of the dialog and return top left corner coordinate', () => {
            const browserX = 100;
            const pageWidth = 1000;
            const initX = browserX - (DIALOG_WIDTH / 2);
            const dialogEl = document.querySelector('.bp-annotation-dialog');

            const dialogX = repositionCaret(dialogEl, initX, DIALOG_WIDTH, browserX, pageWidth);

            const annotationCaretEl = dialogEl.querySelector('.bp-annotation-caret');
            expect(dialogX).to.equal(initX); // dialog x unchanged
            expect(annotationCaretEl.style.left).to.equal('50%'); // caret centered with dialog
        });
    });

    describe('isPending()', () => {
        it('return true if thread is pending or pending-active', () => {
            expect(isPending(constants.ANNOTATION_STATE_PENDING)).to.be.true;
            expect(isPending(constants.ANNOTATION_STATE_PENDING_ACTIVE)).to.be.true;
        });

        it('return false if thread is notpending', () => {
            expect(isPending(constants.ANNOTATION_STATE_ACTIVE)).to.be.false;
            expect(isPending(constants.ANNOTATION_STATE_ACTIVE_HOVER)).to.be.false;
            expect(isPending(constants.ANNOTATION_STATE_HOVER)).to.be.false;
            expect(isPending(constants.ANNOTATION_STATE_INACTIVE)).to.be.false;
        });
    });
});
