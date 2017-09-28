import 'whatwg-fetch';
import {
    PERMISSION_ANNOTATE,
    PERMISSION_CAN_VIEW_ANNOTATIONS_ALL,
    PERMISSION_CAN_VIEW_ANNOTATIONS_SELF,
    TYPES,
    SELECTOR_ANNOTATION_CARET,
    PENDING_STATES,
    CLASS_ACTIVE,
    CLASS_HIDDEN,
    CLASS_INVISIBLE,
    CLASS_DISABLED
} from './annotationConstants';

const HEADER_CLIENT_NAME = 'X-Box-Client-Name';
const HEADER_CLIENT_VERSION = 'X-Box-Client-Version';
/* eslint-disable no-undef */
const CLIENT_NAME = __NAME__;
const CLIENT_VERSION = __VERSION__;
/* eslint-enable no-undef */

const AVATAR_COLOR_COUNT = 9; // 9 colors defined in Box React UI avatar code
const THREAD_PARAMS = [
    'annotatedElement',
    'annotations',
    'annotationService',
    'fileVersionId',
    'locale',
    'location',
    'type'
];

//------------------------------------------------------------------------------
// DOM Utils
//------------------------------------------------------------------------------

/**
 * Finds the closest ancestor DOM element with the specified class.
 *
 * @param {HTMLElement} element - Element to search ancestors of
 * @param {string} className - Class name to query
 * @return {HTMLElement|null} Closest ancestor with given class or null
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
 * Returns the page element and page number that the element is on.
 *
 * @param {HTMLElement} element - Element to find page and page number for
 * @return {Object} Page element/page number if found or null/-1 if not
 */
export function getPageInfo(element) {
    const pageEl = findClosestElWithClass(element, 'page') || null;
    let page = 1;

    if (pageEl) {
        page = parseInt(pageEl.getAttribute('data-page-number'), 10);
    }

    return { pageEl, page };
}

/**
 * Finds the closest element with a data type and returns that data type. If
 * an attributeName is provided, search for that data atttribute instead of
 * data type.
 *
 * @param {HTMLElement} element - Element to find closest data type for
 * @param {string} [attributeName] - Optional different data attribute to search
 * for
 * @return {string} Closest data type or empty string
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
 *
 * @param {HTMLElement|string} elementOrSelector - Element or CSS selector
 * @return {void}
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
 *
 * @param {HTMLElement|string} elementOrSelector - Element or CSS selector
 * @return {void}
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
 * Disables the specified element or element with specified selector.
 *
 * @param {HTMLElement|string} elementOrSelector - Element or CSS selector
 * @return {void}
 */
export function disableElement(elementOrSelector) {
    let element = elementOrSelector;
    if (typeof elementOrSelector === 'string' || elementOrSelector instanceof String) {
        element = document.querySelector(elementOrSelector);
    }

    if (element) {
        element.classList.add(CLASS_DISABLED);
    }
}

/**
 * Enables the specified element or element with specified selector.
 *
 * @param {HTMLElement|string} elementOrSelector - Element or CSS selector
 * @return {void}
 */
export function enableElement(elementOrSelector) {
    let element = elementOrSelector;
    if (typeof elementOrSelector === 'string' || elementOrSelector instanceof String) {
        element = document.querySelector(elementOrSelector);
    }

    if (element) {
        element.classList.remove(CLASS_DISABLED);
    }
}

/**
 * Shows the specified element or element with specified selector.
 *
 * @param {HTMLElement|string} elementOrSelector - Element or CSS selector
 * @return {void}
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
 * will still take up DOM space but not be visible in the UI.
 *
 * @param {HTMLElement|string} elementOrSelector - Element or CSS selector
 * @return {void}
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
 *
 * @param {HTMLElement} element - Textarea to reset
 * @param {boolean} clearText - Whether or not text in text area should be cleared
 * @return {void}
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

/**
 * Checks whether mouse is inside the dialog represented by this thread.
 *
 * @private
 * @param {Event} event - Mouse event
 * @param {HTMLElement} dialogEl - Dialog element
 * @return {boolean} Whether or not mouse is inside dialog
 */
export function isInDialog(event, dialogEl) {
    if (!dialogEl) {
        return false;
    }

    // DOM coordinates with respect to the page
    const x = event.clientX;
    const y = event.clientY;

    // Get dialog dimensions
    const dialogDimensions = dialogEl.getBoundingClientRect();

    if (
        y >= dialogDimensions.top &&
        y <= dialogDimensions.bottom &&
        x >= dialogDimensions.left &&
        x <= dialogDimensions.right
    ) {
        return true;
    }
    return false;
}

/**
 * Creates contextual fragment
 *
 * @public
 * @param {Element} node - DOM node
 * @param {string} template - HTML template
 * @return {DocumentFragment} Document fragment
 */
export function createFragment(node, template) {
    const range = document.createRange();
    range.selectNode(node);
    return range.createContextualFragment(template.replace(/>\s*</g, '><')); // remove new lines
}

/**
 * Inserts template string into DOM node, before beforeNode. If beforeNode is null, inserts at end of child nodes
 *
 * @public
 * @param {Element} node - DOM node
 * @param {string} template  html template
 * @param {Element|void} beforeNode - DOM node
 * @return {void}
 */
export function insertTemplate(node, template, beforeNode = null) {
    node.insertBefore(createFragment(node, template), beforeNode);
}

//------------------------------------------------------------------------------
// Point Utils
//------------------------------------------------------------------------------

/**
 * Checks whether element is fully in viewport.
 *
 * @param {HTMLElement} element - The element to check and see if it lies in the viewport
 * @return {boolean} Whether the element is fully in viewport
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
 *
 * @param {string} avatarUrl - URL of avatar photo
 * @param {string} userId - User ID of annotator
 * @param {string} userName - Username of annotator
 * @return {string} HTML for profile image
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
    return `<div class="bp-annotation-profile avatar-color-${index % AVATAR_COLOR_COUNT}">${initials}</div>`.trim();
}

/**
 * Returns zoom scale of annotated element.
 *
 * @param {HTMLElement} annotatedElement - HTML element being annotated on
 * @return {number} Zoom scale
 */
export function getScale(annotatedElement) {
    return parseFloat(annotatedElement.getAttribute('data-scale')) || 1;
}

//------------------------------------------------------------------------------
// Highlight Utils
//------------------------------------------------------------------------------

/**
 * Return first annotation in thread
 *
 * @param {Object} annotations - Annotations in thread
 * @return {Annotation} First annotation in thread
 */
export function getFirstAnnotation(annotations) {
    const firstAnnotationId = Object.keys(annotations)[0];
    return annotations[firstAnnotationId];
}

/**
 * Whether or not a highlight annotation has comments or is a plain highlight
 *
 * @param {Object} annotations - Annotations in highlight thread
 * @return {boolean} Whether annotation is a plain highlight annotation
 */
export function isPlainHighlight(annotations) {
    const firstAnnotation = getFirstAnnotation(annotations);
    return Object.keys(annotations).length === 1 && firstAnnotation.text === '';
}

/**
 * Returns whether or not the annotation type is 'highlight' or
 * 'highlight-comment'
 *
 * @param {string} type - Annotatation type
 * @return {boolean} Whether or not annotation is a highlight
 */
export function isHighlightAnnotation(type) {
    return type === TYPES.highlight || type === TYPES.highlight_comment;
}

//------------------------------------------------------------------------------
// General Utils
//------------------------------------------------------------------------------

/**
 * Returns dimension scale multiplier for x and y axes calculated from comparing
 * the current annotated element dimensions scaled to 100% with annotated
 * element dimensions when annotations were created.
 *
 * @param {Object} dimensions - Dimensions saved in annotation
 * @param {Object} fileDimensions - Current annotated element dimensions
 * @param {number} zoomScale - Zoom scale
 * @param {number} heightPadding - Top & bottom padding for annotated element
 * @return {Object|null} {x, y} dimension scale if needed, null otherwise
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
 *
 * @param {string} str - Input string
 * @return {string} HTML escaped string
 */
export function htmlEscape(str) {
    return `${str}`
        .replace(/&/g, '&amp;') // first!
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
 *
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
    const annotationCaretEl = dialogEl.querySelector(SELECTOR_ANNOTATION_CARET);

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

/**
 * Checks thread is in a pending or pending-active state
 *
 * @param {string} threadState - State of thread
 * @return {boolean} Whether annotation thread is in a pending state
 */
export function isPending(threadState) {
    return PENDING_STATES.indexOf(threadState) > -1;
}

/**
 * Checks whether annotation thread is valid by checking whether each property
 * in THREAD_PARAMS on the specified file object is defined.
 *
 * @param {Object} thread - Annotation thread params to check
 * @return {boolean} Whether or not annotation thread has all the required params
 */
export function validateThreadParams(thread) {
    if (thread) {
        return THREAD_PARAMS.every((param) => typeof thread[param] !== 'undefined');
    }
    return false;
}

/**
 * Returns a function that passes a callback a location when given an event on the document text layer
 *
 * @param {Function} locationFunction - The function to get a location from an event
 * @param {Function} callback - Callback to be called upon receiving an event
 * @return {Function} Event listener to convert to document location
 */
export function eventToLocationHandler(locationFunction, callback) {
    return (event) => {
        const evt = event || window.event;
        // Do nothing when the target isn't the text layer in case the text layer receives event precedence over buttons
        // NOTE: @jpress Currently only applicable to documents.
        // Need to find a better way to ensure button event precedence.
        if (!evt || (evt.target && evt.target.nodeName === 'BUTTON')) {
            return;
        }

        evt.preventDefault();
        evt.stopPropagation();
        const location = locationFunction(evt);
        callback(location);
    };
}

/**
 * Call preventDefault and stopPropagation on an event
 *
 * @param {event} event - Event object to stop event bubbling
 * @return {void}
 */
export function prevDefAndStopProp(event) {
    if (!event) {
        return;
    }

    event.preventDefault();
    event.stopPropagation();
}

/**
 * Create a JSON object containing x/y coordinates and optionally dimensional information
 *
 * @param {number} x - The x position of the location object
 * @param {number} y - The y position of the location object
 * @param {Object} [dimensions] - The dimensional information of the location object
 * @return {Object} - A location object with x/y position information as well as provided dimensional information
 */
export function createLocation(x, y, dimensions) {
    const loc = { x, y };
    if (dimensions) {
        loc.dimensions = dimensions;
    }

    return loc;
}

//------------------------------------------------------------------------------
// General Util Methods
//------------------------------------------------------------------------------

/**
 * Function to decode key down events into keys
 *
 * @param {Event} event - Keydown event
 * @return {string} Decoded keydown key
 */
export function decodeKeydown(event) {
    let modifier = '';

    // KeyboardEvent.key is the new spec supported in Chrome, Firefox and IE.
    // KeyboardEvent.keyIdentifier is the old spec supported in Safari.
    // Priority is given to the new spec.
    let key = event.key || event.keyIdentifier || '';

    // Get the modifiers on their own
    if (event.ctrlKey) {
        modifier = 'Control';
    } else if (event.shiftKey) {
        modifier = 'Shift';
    } else if (event.metaKey) {
        modifier = 'Meta';
    }

    // The key and keyIdentifier specs also include modifiers.
    // Since we are manually getting the modifiers above we do
    // not want to trap them again here.
    if (key === modifier) {
        key = '';
    }

    // keyIdentifier spec returns UTF8 char codes
    // Need to convert them back to ascii.
    if (key.indexOf('U+') === 0) {
        if (key === 'U+001B') {
            key = 'Escape';
        } else {
            key = String.fromCharCode(key.replace('U+', '0x'));
        }
    }

    // If nothing was pressed just return
    if (!key) {
        return '';
    }

    // Special casing for space bar
    if (key === ' ') {
        key = 'Space';
    }

    // Edge bug which outputs "Esc" instead of "Escape"
    // https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/5290772/
    if (key === 'Esc') {
        key = 'Escape';
    }

    // keyIdentifier spec does not prefix the word Arrow.
    // Newer key spec does it automatically.
    if (key === 'Right' || key === 'Left' || key === 'Down' || key === 'Up') {
        key = `Arrow${key}`;
    }

    if (modifier) {
        modifier += '+';
    }

    return modifier + key;
}

/**
 * Builds a list of required XHR headers.
 *
 * @param {Object} [headers] - Optional headers
 * @param {string} [token] - Optional auth token
 * @param {string} [sharedLink] - Optional shared link
 * @param {string} [password] - Optional shared link password
 * @return {Object} Headers
 */
export function getHeaders(headers = {}, token = '', sharedLink = '', password = '') {
    /* eslint-disable no-param-reassign */
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    if (sharedLink) {
        headers.BoxApi = `shared_link=${sharedLink}`;

        if (password) {
            headers.BoxApi = `${headers.BoxApi}&shared_link_password=${password}`;
        }
    }

    // Following headers are for API analytics
    if (CLIENT_NAME) {
        headers[HEADER_CLIENT_NAME] = CLIENT_NAME;
    }

    if (CLIENT_VERSION) {
        headers[HEADER_CLIENT_VERSION] = CLIENT_VERSION;
    }

    /* eslint-enable no-param-reassign */
    return headers;
}

/**
 * Round a number to a certain decimal place by concatenating an exponential factor. Credits to lodash library.
 *
 * @param {number} number - The number to be rounded
 * @param {number} precision - The amount of decimal places to keep
 * @return {number} The rounded number
 */
export function round(number, precision) {
    /* eslint-disable prefer-template */
    let pair = (number + 'e').split('e');
    const value = Math.round(pair[0] + 'e' + (+pair[1] + precision));
    pair = (value + 'e').split('e');
    return +(pair[0] + 'e' + (+pair[1] - precision));
    /* eslint-enable prefer-template */
}

/**
 * Replaces variable place holders specified between {} in the string with
 * specified custom value. Localizes strings that include variables.
 *
 * @param {string} string - String to be interpolated
 * @param {string[]} placeholderValues - Custom values to replace into string
 * @return {string} Properly translated string with replaced custom variable
 */
export function replacePlaceholders(string, placeholderValues) {
    const regex = /\{\d+\}/g;

    if (!string || !string.length) {
        return string;
    }

    return string.replace(regex, (match) => {
        // extracting the index that is supposed to replace the matched placeholder
        const placeholderIndex = parseInt(match.replace(/^\D+/g, ''), 10) - 1;

        /* eslint-disable no-plusplus */
        return placeholderValues[placeholderIndex] ? placeholderValues[placeholderIndex] : match;
        /* eslint-enable no-plusplus */
    });
}

/**
 * Determines whether the user has file permissions to annotate, view (either
 * their own or everyone's) annotations which would allow annotations to at
 * least be fetched for the current file
 *
 * @param {Object} permissions - File permissions
 * @return {boolean} Whether or not the user has either view OR annotate permissions
 */
export function canLoadAnnotations(permissions) {
    if (!permissions) {
        return false;
    }

    const canAnnotate = permissions[PERMISSION_ANNOTATE];
    const canViewAllAnnotations = permissions[PERMISSION_CAN_VIEW_ANNOTATIONS_ALL];
    const canViewOwnAnnotations = permissions[PERMISSION_CAN_VIEW_ANNOTATIONS_SELF];

    return !!canAnnotate || !!canViewAllAnnotations || !!canViewOwnAnnotations;
}
