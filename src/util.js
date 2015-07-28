'use strict';

/**
 * Element.closest()
 * @param  {HTMLElement} element
 * @param  {string} selector
 * @public
 * @returns {HTMLElement}
 */
function closest(element, selector) {
    while (element) {
        if (element.matches(selector)) {
            break;
        }

        element = element.parentElement;
    }

    return element;
};

module.exports = {
    closest: closest
};
