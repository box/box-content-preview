/**
 * @fileoverview Annotator utility functions.
 * @author tjin
 */

import { CLASS_ACTIVE, CLASS_HIDDEN } from '../constants';

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
 * Reset textarea element - clears value, resets styles, and remove active
 * state.
 * @param {HTMLElement} element Textarea to reset
 * @returns {void}
 */
export function resetTextarea(element) {
    const textareaEl = element;
    textareaEl.value = '';
    textareaEl.style.width = '';
    textareaEl.style.height = '';
    textareaEl.classList.remove(CLASS_ACTIVE);
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
    if (userId !== 0) {
        // http://stackoverflow.com/questions/8133630/spliting-the-first-character-of-the-words
        initials = userName.replace(/\W*(\w)\w*/g, '$1').toUpperCase().substring(0, 3);
    }
    return `<div class="box-preview-annotation-profile avatar-color-${userId % AVATAR_COLOR_COUNT}">${initials}</div>`.trim();
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
// General Utils
//------------------------------------------------------------------------------

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
