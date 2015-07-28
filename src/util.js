'use strict';

/**
 * Adapted from underscore.js http://underscorejs.org/docs/underscore.html
 *
 * Returns a function, that, as long as it continues to be invoked, will not be triggered.
 * The function will be called after it stops being called for N milliseconds.
 * If immediate is passed, trigger the function on the leading edge, instead of the trailing.
 *
 * Use debouncing when dealing with events like window resizing when you want to resize the content
 * only when the user has stopped resizing the browser. Debouncing can also be used for mousemove and mousescroll
 * depending upon the use case when you want the user to 1st stop before triggering the function.
 *
 * @param {Function} func The function for debounce
 * @param {number} wait How long should the time out be
 * @param {boolean} immediate If true, trigger the function on the leading edge, instead of the trailing.
 * @private
 * @returns {Function}
 */
function debounce(func, wait, immediate) {

    var timeout,
        args,
        context,
        timestamp,
        result,
        later = function() {
            var last = (new Date().getTime()) - timestamp;

            if (last < wait && last > 0) {
                timeout = setTimeout(later, wait - last);
            } else {
                timeout = null;
                if (!immediate) {
                    result = func.apply(context, args);
                    if (!timeout) {
                        context = args = null;
                    }
                }
            }
        };

    return function() {
        var callNow = immediate && !timeout;

        context = this;
        args = arguments;
        timestamp = (new Date().getTime());

        if (!timeout) {
            timeout = setTimeout(later, wait);
        }

        if (callNow) {
            result = func.apply(context, args);
            context = args = null;
        }

        return result;
    };
}

/**
 * Adapted from underscore.js http://underscorejs.org/docs/underscore.html
 *
 * Returns a function, that, when invoked, will only be triggered at most once during a given window of time.
 * Normally, the throttled function will run as much as it can, without ever going more than once per wait duration.
 *
 * Use throttling when dealing with events like mousemove and mousescroll when you want the events to fire
 * periodically unlike debouncing where they are fired only when the user has stopped mousemoving or scrolling.
 *
 * @param {Function} func The function to throttle
 * @param {number} wait How long should the time out be
 * @private
 * @returns {Function}
 */
function throttle(func, wait) {

    var context,
        args,
        result,
        timeout = null,
        previous = 0,
        later = function() {
            previous = (new Date().getTime());
            timeout = null;
            result = func.apply(context, args);
            if (!timeout) {
                context = args = null;
            }
        };

    return function() {
        var now = (new Date().getTime()),
            remaining = wait - (now - previous);

        context = this;
        args = arguments;

        if (remaining <= 0 || remaining > wait) {
            clearTimeout(timeout);
            timeout = null;
            previous = now;
            result = func.apply(context, args);
            if (!timeout) {
                context = args = null;
            }
        } else if (!timeout) {
            timeout = setTimeout(later, remaining);
        }

        return result;
    };
}

module.exports = {
    throttle: throttle,
    debounce: debounce
};
