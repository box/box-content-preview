import {
    findClosestElWithClass,
    findClosestDataType,
    showElement,
    hideElement,
    resetTextarea,
    isElementInViewport,
    getAvatarHtml,
    getScale,
    htmlEscape
} from '../../annotation/annotator-util';

describe('annotator-util', () => {
    let childEl;
    let parentEl;

    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('annotation/__tests__/annotator-util-test.html');

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
            assert.equal(getAvatarHtml('https://example.com', 1, 'Some Name'), expectedHtml);
        });

        it('should return avatar HTML initials if no avatarUrl is provided', () => {
            const expectedHtml = '<div class="box-preview-annotation-profile avatar-color-1">SN</div>'.trim();
            assert.equal(getAvatarHtml('', 1, 'Some Name'), expectedHtml);
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

    describe('htmlEscape()', () => {
        it('should return HTML-escaped text', () => {
            assert.equal(htmlEscape('test&file=what'), 'test&amp;file=what', 'Should escape and symbol');
            assert.equal(htmlEscape('<script>'), '&lt;script&gt;', 'Should escape brackets');
            assert.equal(htmlEscape('"string"'), '&quot;string&quot;', 'Should escape double quote');
            assert.equal(htmlEscape('\'string\''), '&#39;string&#39;', 'Should escape single quote');
            assert.equal(htmlEscape('`string`'), '&#96;string&#96;', 'Should escape back tick');
        });
    });
});
