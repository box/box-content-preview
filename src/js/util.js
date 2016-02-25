const loadedJSAssets = [];
const loadedCSSAssets = [];
const prefetchedAssets = [];

/**
 * Inserts template string into dom node
 *
 * @public
 * @param {Element} node dom node
 * @param {String} template  html template
 * @returns {void}
 */
export function insertTemplate(node, template) {
    const range = document.createRange();
    range.selectNode(node);
    node.appendChild(range.createContextualFragment(template));
}

/**
 * Create <script> element to load external script
 *
 * @public
 * @param {String} url  asset url
 * @returns {Array} script element
 */
export function createScript(url) {
    const script = document.createElement('script');
    script.src = url;
    script.async = false;
    return script;
}

/**
 * Create <link> element to prefetch external resource
 *
 * @public
 * @param {string} url  asset urls
 * @returns {HTMLElement} prefetch link element
 */
export function createPrefetch(url) {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    return link;
}

/**
 * Create <link> element to load external stylesheet
 *
 * @public
 * @param {string} url  asset urls
 * @returns {HTMLElement} css link element
 */
export function createStylesheet(url) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = url;
    return link;
}

/**
 * Creates the content URLs
 *
 * @public
 * @param {String} url content url
 * @param {String} [token] optional auth token
 * @returns {String} content urls
 */
export function createContentUrl(url, token) {
    if (!token) {
        return url;
    }

    let delim = '?';

    if (url.indexOf('?') > 0) {
        delim = '&';
    }

    return url + delim + 'access_token=' + token;
}

/**
 * Factory to create asset URLs
 *
 * @public
 * @param {location} location object
 * @returns {Function} factory for creating asset url
 */
export function createAssetUrlCreator(location) {
    const baseURI = location.baseURI;
    const staticBaseURI = location.staticBaseURI;

    return (name) => {
        let asset;

        if (name.indexOf('http') === 0) {
            // This is a full url
            asset = name;
        } else if (name.indexOf('third-party') === 0) {
            // This is a static third-party asset thats not localized
            asset = staticBaseURI + name;
        } else {
            // This is our own asset that is localized
            asset = baseURI + name;
        }

        return asset;
    };
}

/**
 * Prefetches external stylsheets or js by appending a <link rel="prefetch"> element
 *
 * @param {Array} urls asset urls
 * @returns {void}
 */
export function prefetchAssets(urls) {
    const head = document.getElementsByTagName('head')[0];

    urls.forEach((url) => {
        if (prefetchedAssets.indexOf(url) === -1) {
            prefetchedAssets.push(url);
            head.appendChild(createPrefetch(url));
        }
    });
}

/**
 * Loads external stylsheets by appending a <link> element
 *
 * @param {Array} urls asset urls
 * @returns {void}
 */
export function loadStylesheets(urls) {
    const head = document.getElementsByTagName('head')[0];

    urls.forEach((url) => {
        if (loadedCSSAssets.indexOf(url) === -1) {
            loadedCSSAssets.push(url);
            head.appendChild(createStylesheet(url));
        }
    });
}

/**
 * Loads external scripts by appending a <script> element
 *
 * @param {Array} urls asset urls
 * @returns {Promise} Promise to load scripts
 */
export function loadScripts(urls) {
    const head = document.getElementsByTagName('head')[0];
    const promises = [];

    urls.forEach((url) => {
        if (loadedJSAssets.indexOf(url) === -1) {
            loadedJSAssets.push(url);
            let script = createScript(url);
            promises.push(new Promise((resolve, reject) => {
                script.addEventListener('load', resolve);
                script.addEventListener('error', reject);
            }));
            head.appendChild(script);
        }
    });

    return Promise.all(promises);
}

/**
 * Function to decode key down events into keys
 *
 * @public
 * @param {Event} event keydown event
 * @returns {String} decoded keydown key
 */
export function decodeKeydown(event) {

    let modifier = '';

    // KeyboardEvent.key is the new spec supported in Firefox and IE.
    // KeyboardEvent.keyIdentifier is the old spec supported in Chrome and Safari.
    // Priority is given to the new spec.
    let key = event.key || event.keyIdentifier;

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

    // keyIdentifier spec does not prefix the word Arrow.
    // Newer key spec does it automatically.
    if (key === 'Right' || key === 'Left' || key === 'Down' || key === 'Up') {
        key = 'Arrow' + key;
    }

    if (modifier) {
        modifier += '+';
    }

    return modifier + key;
}

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
export function debounce(func, wait, immediate) {

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
export function throttle(func, wait) {

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
