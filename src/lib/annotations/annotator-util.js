/**
 * @fileoverview Annotator utility functions.
 * @author tjin
 */

import { CLASS_ACTIVE, CLASS_HIDDEN, CLASS_INVISIBLE } from '../constants';
import * as constants from './annotation-constants';

const AVATAR_COLOR_COUNT = 9; // 9 colors defined in Box React UI avatar code

//------------------------------------------------------------------------------
// DOM Utils
//------------------------------------------------------------------------------

/**
 * Finds the closest ancestor DOM element with the specified class.
 * @param {HTMLElement} element Element to search ancestors of
 * @param {string} className Class name to query
 * @returns {HTMLElement|null} Closest ancestor with given class or null
 */
export function findClosestElWithClass(element, className) {
    for (let el = element; el && el !== document; el = el.parentNode) {
        if (el.classList && el.classList.contains(className)) {
            return el;
        }
    }

    return null;
}

/**
 * Finds the closest element with a data type and returns that data type. If
 * an attributeName is provided, search for that data atttribute instead of
 * data type.
 * @param {HTMLElement} element Element to find closest data type for
 * @param {string} [attributeName] Optional different data attribute to search
 * for
 * @returns {string} Closest data type or empty string
 */
export function findClosestDataType(element, attributeName) {
    const attributeToFind = attributeName || 'data-type';

    for (let el = element; el && el !== document; el = el.parentNode) {
        if (el && el.getAttribute(attributeToFind)) {
            return el.getAttribute(attributeToFind);
        }
    }

    return '';
}

/**
 * Shows the specified element or element with specified selector.
 * @param {HTMLElement|string} elementOrSelector Element or CSS selector
 * @returns {void}
 */
export function showElement(elementOrSelector) {
    let element = elementOrSelector;
    if (typeof elementOrSelector === 'string' || elementOrSelector instanceof String) {
        element = document.querySelector(elementOrSelector);
    }

    if (element) {
        element.classList.remove(CLASS_HIDDEN);
    }
}

/**
 * Hides the specified element or element with specified selector.
 * @param {HTMLElement|string} elementOrSelector Element or CSS selector
 * @returns {void}
 */
export function hideElement(elementOrSelector) {
    let element = elementOrSelector;
    if (typeof elementOrSelector === 'string' || elementOrSelector instanceof String) {
        element = document.querySelector(elementOrSelector);
    }

    if (element) {
        element.classList.add(CLASS_HIDDEN);
    }
}

/**
 * Shows the specified element or element with specified selector.
 * @param {HTMLElement|string} elementOrSelector Element or CSS selector
 * @returns {void}
 */
export function showInvisibleElement(elementOrSelector) {
    let element = elementOrSelector;
    if (typeof elementOrSelector === 'string' || elementOrSelector instanceof String) {
        element = document.querySelector(elementOrSelector);
    }

    if (element) {
        element.classList.remove(CLASS_INVISIBLE);
    }
}

/**
 * Hides the specified element or element with specified selector. The element
 * will still take up DOM space but not be visible in the UI
 * @param {HTMLElement|string} elementOrSelector Element or CSS selector
 * @returns {void}
 */
export function hideElementVisibility(elementOrSelector) {
    let element = elementOrSelector;
    if (typeof elementOrSelector === 'string' || elementOrSelector instanceof String) {
        element = document.querySelector(elementOrSelector);
    }

    if (element) {
        element.classList.add(CLASS_INVISIBLE);
    }
}

/**
 * Reset textarea element - clears value, resets styles, and remove active
 * state.
 * @param {HTMLElement} element Textarea to reset
 * @param {Boolean} clearText Whether or not text in text area should be cleared
 * @returns {void}
 */
export function resetTextarea(element, clearText) {
    const textareaEl = element;
    textareaEl.style.width = '';
    textareaEl.style.height = '';
    textareaEl.classList.remove(CLASS_ACTIVE);

    if (clearText) {
        textareaEl.value = '';
    }
}

//------------------------------------------------------------------------------
// Point Utils
//------------------------------------------------------------------------------

/**
 * Checks whether element is fully in viewport.
 * @returns {boolean} Whether element is fully in viewport
 */
export function isElementInViewport(element) {
    const dimensions = element.getBoundingClientRect();

    return (
        dimensions.top >= 0 &&
        dimensions.left >= 0 &&
        dimensions.bottom <= window.innerHeight &&
        dimensions.right <= window.innerWidth
    );
}

/**
 * Returns avatar image HTML for annotation dialog. This will be either an
 * image with the supplied avatar URL as a source if there is a URL passed in
 * or one generated using the initials of the annotator.
 * @param {string} avatarUrl URL of avatar photo
 * @param {string} userId User ID of annotator
 * @param {string} userName Username of annotator
 * @returns {string} HTML for profile image
 */
export function getAvatarHtml(avatarUrl, userId, userName) {
    if (avatarUrl !== '') {
        return `<img src="${avatarUrl}" alt="${__('annotation_profile_alt')}">`.trim();
    }

    let initials = '';
    if (userId !== '0') {
        // http://stackoverflow.com/questions/8133630/spliting-the-first-character-of-the-words
        initials = userName.replace(/\W*(\w)\w*/g, '$1').toUpperCase().substring(0, 3);
    }

    const index = parseInt(userId, 10) || 0;
    return `<div class="box-preview-annotation-profile avatar-color-${index % AVATAR_COLOR_COUNT}">${initials}</div>`.trim();
}

/**
 * Returns zoom scale of annotated element.
 * @param {HTMLElement} annotatedElement HTML element being annotated on
 * @returns {number} Zoom scale
 */
export function getScale(annotatedElement) {
    return parseFloat(annotatedElement.getAttribute('data-scale')) || 1;
}

//------------------------------------------------------------------------------
// Highlight Utils
//------------------------------------------------------------------------------

/**
 * Whether or not a highlight annotation has comments or is a plain highlight
 * @param {Annotation[]} Annotations in highlight thread
 * @return {Boolean} Whether annotation is a plain highlight annotation
 */
export function isPlainHighlight(annotations) {
    return annotations.length === 1 && annotations[0].text === '';
}

/**
 * Returns whether or not the annotation type is 'highlight' or
 * 'highlight-comment'
 * @return {boolean} Whether or not annotation is a highlight
 */
export function isHighlightAnnotation(type) {
    return (type === constants.ANNOTATION_TYPE_HIGHLIGHT ||
        type === constants.ANNOTATION_TYPE_HIGHLIGHT_COMMENT);
}

//------------------------------------------------------------------------------
// General Utils
//------------------------------------------------------------------------------

/**
 * Returns dimension scale multiplier for x and y axes calculated from comparing
 * the current annotated element dimensions scaled to 100% with annotated
 * element dimensions when annotations were created.
 *
 * @param {Object} dimensions Dimensions saved in annotation
 * @param {Object} fileDimensions Current annotated element dimensions
 * @param {number} zoomScale Zoom scale
 * @param {number} heightPadding Top & bottom padding for annotated element
 * @returns {Object|null} {x, y} dimension scale if needed, null otherwise
 */
export function getDimensionScale(dimensions, fileDimensions, zoomScale, heightPadding) {
    let dimensionScale = null;

    // Scale comparing current dimensions with saved dimensions if needed
    if (dimensions && dimensions.x !== undefined && dimensions.y !== undefined) {
        const width = fileDimensions.width / zoomScale;
        const height = (fileDimensions.height - heightPadding) / zoomScale;

        // Ignore sub-pixel variations that could result from float math
        if (Math.abs(width - dimensions.x) > 1 || Math.abs(height !== dimensions.y) > 1) {
            dimensionScale = {
                x: width / dimensions.x,
                y: height / dimensions.y
            };
        }
    }

    return dimensionScale;
}

/**
 * Escapes HTML.
 * @param {string} str Input string
 * @returns {string} HTML escaped string
 */
export function htmlEscape(str) {
    return `${str}`.replace(/&/g, '&amp;') // first!
              .replace(/>/g, '&gt;')
              .replace(/</g, '&lt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#39;')
              .replace(/`/g, '&#96;');
}

/**
 * Repositions caret if annotations dialog will run off the right or left
 * side of the page. Otherwise positions caret at the center of the
 * annotations dialog and the updated left corner x coordinate.
 * @param  {HTMLElement} dialogEl Annotations dialog element
 * @param  {number} dialogX Left corner x coordinate of the annotations dialog
 * @param  {number} highlightDialogWidth Width of the annotations dialog
 * @param  {number} browserX X coordinate of the mouse position
 * @param  {number} pageWidth Width of document page
 * @return {number} Adjusted left corner x coordinate of the annotations dialog
 */
export function repositionCaret(dialogEl, dialogX, highlightDialogWidth, browserX, pageWidth) {
    // Reposition to avoid sides - left side of page is 0px, right side is
    // ${pageWidth}px
    const dialogPastLeft = dialogX < 0;
    const dialogPastRight = dialogX + highlightDialogWidth > pageWidth;
    const annotationCaretEl = dialogEl.querySelector('.box-preview-annotation-caret');

    if (dialogPastLeft && !dialogPastRight) {
        // Leave a minimum of 10 pixels so caret doesn't go off edge
        const caretLeftX = Math.max(10, browserX);
        annotationCaretEl.style.left = `${caretLeftX}px`;

        return 0;
    } else if (dialogPastRight && !dialogPastLeft) {
        // Leave a minimum of 10 pixels so caret doesn't go off edge
        const caretRightX = Math.max(10, pageWidth - browserX);

        // We set the 'left' property even when we have caretRightX for
        // IE10/11
        annotationCaretEl.style.left = `${highlightDialogWidth - caretRightX}px`;

        return pageWidth - highlightDialogWidth;
    }

    // Reset caret to center
    annotationCaretEl.style.left = '50%';
    return dialogX;
}
