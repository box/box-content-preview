import Uri from 'jsuri';
import { decode } from 'box-ui-elements/es/utils/keys';
import DownloadReachability from './DownloadReachability';
import Location from './Location';
import PreviewError from './PreviewError';
import { ERROR_CODE } from './events';

const CLIENT_NAME = __NAME__; // eslint-disable-line no-undef
const CLIENT_NAME_KEY = 'box_client_name';
const CLIENT_VERSION_KEY = 'box_client_version';
export const CLIENT_VERSION = __VERSION__; // eslint-disable-line no-undef
const HEADER_CLIENT_NAME = 'X-Box-Client-Name';
const HEADER_CLIENT_VERSION = 'X-Box-Client-Version';
const PROMISE_MAP = {};

/**
 * Clears the promise map of any active promises
 *
 * @private
 * @return {void}
 */
export function clearPromises() {
    Object.keys(PROMISE_MAP).forEach(promiseKey => {
        delete PROMISE_MAP[promiseKey];
    });
}

/**
 * Creates an empty iframe or uses an existing one
 * for the purposes of downloading or printing
 *
 * @private
 * @return {HTMLElement} Iframe
 */
function createDownloadIframe() {
    let iframe = document.querySelector('#downloadiframe');

    // If no download iframe exists, create a new one
    if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.setAttribute('id', 'downloadiframe');
        iframe.style.display = 'none';
        iframe = document.body.appendChild(iframe);
    }

    // Clean the iframe up
    iframe.src = 'about:blank';
    return iframe;
}

/**
 * Opens url in an iframe
 * Used for downloads
 *
 * @public
 * @param {string} url - URL to open
 * @return {HTMLElement} IFrame element
 */
export function openUrlInsideIframe(url) {
    const iframe = createDownloadIframe();
    iframe.src = url;
    return iframe;
}

/**
 * Opens content in an iframe
 * Used for printing
 *
 * @public
 * @param {string} content - HTML content
 * @return {HTMLElement} Iframe element
 */
export function openContentInsideIframe(content) {
    const iframe = createDownloadIframe();
    if (iframe.contentDocument) {
        iframe.contentDocument.write(content);
        iframe.contentDocument.close();
    }
    return iframe;
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

/**
 * Create <script> element to load external script
 *
 * @public
 * @param {string} url - Asset url
 * @return {HTMLElement} Script element
 */
export function createScript(url) {
    const script = document.createElement('script');
    script.src = url;

    // Force scripts to execute in order, see: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script
    script.async = false;
    return script;
}

/**
 * Create <link> element to prefetch external resource
 *
 * @public
 * @param {string} url - Asset urls
 * @param {boolean} preload - Whether or not to use preload, default false
 * @return {HTMLElement} Prefetch link element
 */
export function createPrefetch(url, preload = false) {
    const link = document.createElement('link');
    link.rel = preload ? 'preload' : 'prefetch';
    link.href = url;

    if (preload) {
        link.as = url.indexOf('.js') !== -1 ? 'script' : 'style';
    }

    return link;
}

/**
 * Create <link> element to load external stylesheet
 *
 * @public
 * @param {string} url - Asset urls
 * @return {HTMLElement} CSS link element
 */
export function createStylesheet(url) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = url;
    return link;
}

/**
 * Builds a list of required XHR headers.
 *
 * @public
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
 * Helper function for appending query params to a url
 *
 * @param {string} url - Original url
 * @param {Object} queryParams - Query params object with key value pairs
 * @return {string} Url with query params appended
 */
export function appendQueryParams(url, queryParams) {
    if (!queryParams) {
        return url;
    }

    const uri = new Uri(url);
    Object.keys(queryParams).forEach(key => {
        const value = queryParams[key];
        if (value) {
            if (uri.hasQueryParam(key)) {
                uri.replaceQueryParam(key, value);
            } else {
                uri.addQueryParam(key, value);
            }
        }
    });

    return uri.toString();
}

/**
 * Appends auth params to a url
 *
 * @public
 * @param {string} url - Content url
 * @param {string} [token] - Optional auth token
 * @param {string} [sharedLink] - Optional shared link
 * @param {string} [password] - Optional shared link password
 * @return {string} Url with auth
 */
export function appendAuthParams(url, token = '', sharedLink = '', password = '') {
    if (!token && !sharedLink) {
        return url;
    }

    return appendQueryParams(url, {
        access_token: token,
        shared_link: sharedLink,
        shared_link_password: password,
        [CLIENT_NAME_KEY]: CLIENT_NAME,
        [CLIENT_VERSION_KEY]: CLIENT_VERSION,
    });
}

/**
 * Create a content url from template
 *
 * @public
 * @param {string} template - URL template to attach param to
 * @param {string|void} [asset] - Optional asset name needed to access file
 * @return {string} Content url
 */
export function createContentUrl(template, asset) {
    if (DownloadReachability.isDownloadHostBlocked()) {
        // eslint-disable-next-line
        template = DownloadReachability.replaceDownloadHostWithDefault(template);
    }
    return template.replace('{+asset_path}', asset || '');
}

/**
 * Factory to create asset URLs
 *
 * @public
 * @param {Object} location - Location object
 * @return {Function} Factory for creating asset url
 */
export function createAssetUrlCreator(location) {
    const { baseURI, staticBaseURI } = location;

    return name => {
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
 * @public
 * @param {Array} urls - Asset urls
 * @param {boolean} preload - Use preload instead of prefetch, default false
 * @return {void}
 */
export function prefetchAssets(urls, preload = false) {
    const { head } = document;
    const rel = preload ? 'preload' : 'prefetch';

    urls.forEach(url => {
        if (!head.querySelector(`link[rel="${rel}"][href="${url}"]`)) {
            head.appendChild(createPrefetch(url, preload));
        }
    });
}

/**
 * Loads external stylsheets by appending a <link> element
 *
 * @public
 * @param {Array} urls - Asset urls
 * @return {void}
 */
export function loadStylesheets(urls) {
    const { head } = document;

    urls.forEach(url => {
        if (!head.querySelector(`link[rel="stylesheet"][href="${url}"]`)) {
            head.appendChild(createStylesheet(url));
        }
    });
}

/**
 * Loads external scripts by appending a <script> element
 *
 * @public
 * @param {Array} urls - Asset urls
 * @param {string} [disableAMD] - Temporarily disable AMD definitions while external scripts are loading
 * @return {Promise} Promise to load scripts
 */
export function loadScripts(urls, disableAMD = false) {
    const { head } = document;
    const promises = [];

    // Preview expects third party assets to be loaded into the global scope. However, many of our third party
    // assets include a UMD module definition, and a parent application using RequireJS or a similar AMD module loader
    // will trigger the AMD check in these UMD definitions and prevent the necessary assets from being loaded in the
    // global scope. If `disableAMD` is passed, we get around this by temporarily disabling `define()` until Preview's
    // scripts are loaded.

    /* eslint-disable no-undef */
    const amdPresent = !!window.define && typeof define === 'function' && !!define.amd;
    const defineRef = amdPresent ? define : undefined;

    if (disableAMD && amdPresent) {
        define = undefined;
    }

    urls.forEach(url => {
        if (!head.querySelector(`script[src="${url}"]`) && !PROMISE_MAP[url]) {
            const script = createScript(url);
            PROMISE_MAP[url] = new Promise((resolve, reject) => {
                script.addEventListener('load', resolve);
                script.addEventListener('error', reject);
            });

            head.appendChild(script);
        }

        promises.push(PROMISE_MAP[url]);
    });

    return Promise.all(promises)
        .then(() => {
            if (disableAMD && amdPresent) {
                define = defineRef;
            }

            clearPromises();
        })
        .catch(() => {
            if (disableAMD && amdPresent) {
                define = defineRef;
            }

            clearPromises();
        });
}

/**
 * Function to decode key down events into keys
 *
 * @public
 * @param {Event} event - Keydown event
 * @return {string} Decoded keydown key
 */
export function decodeKeydown(event) {
    return decode(event);
}

/**
 * Find location information about a script include
 *
 * @public
 * @param {string} name - Script name
 * @param {HTMLScriptElement} [script] - optional script element
 * @return {Object} Script location object
 */
export function findScriptLocation(name, script) {
    const scriptEl = document.querySelector(`script[src*="/${name}"]`) || {};
    const scriptSrc = script ? script.src : scriptEl.src;

    // Double check if we found the correct script. Ignore tests.
    if (!scriptSrc || (scriptSrc.indexOf(name) === -1 && scriptSrc.indexOf('__tests__') === -1)) {
        throw new Error(`Missing or malformed ${name} library`);
    }

    const anchor = document.createElement('a');
    anchor.href = scriptSrc;

    const { pathname } = anchor;
    const pathFragments = pathname.split('/');
    const fragmentLength = pathFragments.length;
    const fileName = pathFragments[fragmentLength - 1];
    const locale = pathFragments[fragmentLength - 2];
    const version = pathFragments[fragmentLength - 3];
    const query = anchor.search;
    const baseURI = anchor.href.replace(fileName, '').replace(query, '');
    const staticBaseURI = baseURI.replace(`${version}/${locale}/`, '');

    return {
        origin: anchor.origin,
        host: anchor.host,
        hostname: anchor.hostname,
        search: query,
        protocol: anchor.protocol,
        port: anchor.port,
        href: anchor.href,
        pathname,
        locale,
        version,
        baseURI,
        staticBaseURI,
    };
}

/**
 * Replaces variable place holders specified between {} in the string with
 * specified custom value. Localizes strings that include variables.
 *
 * @public
 * @param {string} string - String to be interpolated
 * @param {Array} placeholderValues - Ordered array of replacement strings
 * @return {string} Properly translated string with replaced custom variable
 */
export function replacePlaceholders(string, placeholderValues) {
    const regex = /\{\d+\}/g;

    if (!string || !string.length) {
        return string;
    }

    return string.replace(regex, match => {
        // extracting the index that is supposed to replace the matched placeholder
        const placeholderIndex = parseInt(match.replace(/^\D+/g, ''), 10) - 1;

        // eslint-disable-next-line
        return placeholderValues[placeholderIndex] ? placeholderValues[placeholderIndex] : match;
    });
}

/**
 * Check to see if a file requires a Box3D viewer to be viewed.
 *
 * @public
 * @param {Object} file - The file to check
 * @return {boolean} True if the file needs a Box3D 360 degree viewer to be viewed
 */
export function requires360Viewer(file) {
    // For now, we'll only support this preview if the filename has a secondary
    // extension of '360' (e.g. file.360.mp4)
    const basename = file.name.slice(0, file.name.lastIndexOf('.'));
    return basename.endsWith('.360');
}

/**
 * Set width/height for an element.
 *
 * @public
 * @param {HTMLElement} element - HTML element
 * @param {number} width - Width in pixels
 * @param {number} height - Height in pixels
 * @return {void}
 */
export function setDimensions(element, width, height) {
    /* eslint-disable no-param-reassign */
    element.style.width = `${width}px`;
    element.style.height = `${height}px`;
    /* eslint-enable no-param-reassign */
}

/**
 * Wrapper around an event-handler that returns another event-handler which first checks that
 * the event is a click, space-key, or enter-key before invoking the handler
 *
 * @public
 * @param {Function} handler - Key activation handler
 * @return {void}
 */
export function activationHandler(handler) {
    return event => {
        if (event.type === 'click') {
            handler(event);
        } else if (event.type === 'keydown') {
            const key = decodeKeydown(event);
            if (key === 'Space' || key === 'Enter') {
                handler(event);
                event.preventDefault();
                event.stopPropagation();
            }
        }
    };
}

/**
 * Adds event listeners for click, space, and enter keys
 *
 * @public
 * @param {HTMLElement} element - HTMLElement
 * @param {Function} handler - Function to be invoked on click/space/enter
 * @return {void}
 */
export function addActivationListener(element, handler) {
    element.addEventListener('click', handler);
    element.addEventListener('keydown', handler);
}

/**
 * Removes event listeners added by addActivationListener
 *
 * @public
 * @param {HTMLElement} element - HTMLElement
 * @param {Function} handler - Function to be removed on click/space/enter
 * @return {void}
 */
export function removeActivationListener(element, handler) {
    element.removeEventListener('click', handler);
    element.removeEventListener('keydown', handler);
}

/**
 * Update the page number based on scroll position. Only increment if
 * wrapper is scrolled down past at least half of the current page element.
 * Only decrement page if wrapper is scrolled up past at least half of the
 * previous page element
 *
 * @public
 * @param {number} currentPageNum - The current page
 * @param {number} previousScrollTop - The last recorded Y scrolling position
 * @param {HTMLElement} currentPageEl - The current page element
 * @param {HTMLElement} wrapperEl - The content wrapper element
 * @return {number} the resulting page number
 */
export function pageNumberFromScroll(currentPageNum, previousScrollTop, currentPageEl, wrapperEl) {
    let pageNum = currentPageNum;
    const currentScrollTop = wrapperEl.scrollTop;
    const currentScrollBottom = wrapperEl.scrollTop + wrapperEl.offsetHeight;
    const currentPageMiddleY = currentPageEl.offsetTop + currentPageEl.clientHeight / 2;

    if (currentScrollTop > previousScrollTop) {
        // Scrolling down
        pageNum = currentScrollTop > currentPageMiddleY ? currentPageNum + 1 : currentPageNum;
    } else if (currentScrollTop < previousScrollTop) {
        // Scrolling up
        pageNum = currentScrollBottom < currentPageMiddleY ? currentPageNum - 1 : currentPageNum;
    }

    return pageNum;
}

/**
 * Calculates the midpoint from two points.
 *
 * @public
 * @param {number} x1 - The x value of the first point
 * @param {number} y1 - The y value of the first point
 * @param {number} x2 - The x value of the second point
 * @param {number} y2 - The y value of the second point
 * @return {Array} The resulting x,y point
 */
export function getMidpoint(x1, y1, x2, y2) {
    const x = (x1 + x2) / 2;
    const y = (y1 + y2) / 2;
    return [x, y];
}

/**
 * Calculates the distance between two points.
 *
 * @public
 * @param {number} x1 - The x value of the first point
 * @param {number} y1 - The y value of the first point
 * @param {number} x2 - The x value of the second point
 * @param {number} y2 - The y value of the second point
 * @return {number} The resulting distance
 */
export function getDistance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/**
 * Returns the closest visible page to a pinch event
 *
 * @public
 * @param {number} x - The x value of pinch
 * @param {number} y - The y value of the pinch
 * @param {Object} visiblePages - Object of visible pages to consider
 * @return {HTMLElement} The resulting page
 */
export function getClosestPageToPinch(x, y, visiblePages) {
    if (!visiblePages || !visiblePages.first || !visiblePages.last) {
        return null;
    }

    let closestPage = null;
    for (let i = visiblePages.first.id, closestDistance = null; i <= visiblePages.last.id; i += 1) {
        const page = document.querySelector(`#bp-page-${i}`);
        const pageMidpoint = getMidpoint(
            page.offsetLeft,
            page.offsetTop,
            page.offsetLeft + page.scrollWidth,
            page.offsetTop + page.scrollHeight,
        );

        const distance = getDistance(pageMidpoint[0], pageMidpoint[1], x, y);
        if (!closestPage || distance < closestDistance) {
            closestPage = page;
            closestDistance = distance;
        }
    }

    return closestPage;
}

/**
 * Strip out auth related fields from a string.
 *
 * @param {string} str - A string containing any auth related fields.
 * @return {string} A string with [FILTERED] replacing any auth related fields.
 */
export function stripAuthFromString(str) {
    if (typeof str !== 'string') {
        return str;
    }

    // Strip out "access_token"
    return str.replace(/access_token=([^&]*)/, 'access_token=[FILTERED]');
}

/**
 * Simplified lodash.get, this returns the value of a nested property with string path `propPath`. If that property
 * does not exist on the object, then return `defaultValue`.
 *
 * @param {Object} object - Object to fetch property from
 * @param {string} propPath - String path to property, e.g. 'b.c' if you are trying to fetch a.b.c
 * @param {*} defaultValue - Default value if property is undefined
 * @return {*} Value of prop if defined, defaultValue otherwise
 */
export function getProp(object, propPath, defaultValue) {
    let value = object;
    const path = propPath.split('.');

    for (let i = 0; i < path.length; i += 1) {
        // Checks against null or undefined
        if (value == null) {
            return defaultValue;
        }

        value = value[path[i]];
    }

    return value !== undefined ? value : defaultValue;
}

/**
 * Checks that a fileId is of the expected type.
 * A fileId can be a number, or a string represenation of a number
 *
 * @param {number} fileId - The file id
 * @return {boolean} True if it is valid
 */
export function isValidFileId(fileId) {
    // Tests that the string or number contains all numbers
    return /^\d+$/.test(fileId);
}

/**
 * Returns whether Preview is running inside the Box web application. This should be used sparingly since Preview
 * should function based only on the provided options and not change functionality depending on environment.
 *
 * @return {boolean} Is Preview running in the Box WebApp
 */
export function isBoxWebApp() {
    const boxHostnameRegex = /(app|ent)\.(box\.com|boxcn\.net|boxenterprise\.net)/;
    return boxHostnameRegex.test(Location.getHostname());
}

/**
 * Converts the developer-friendly Preview watermarking preference values to the values expected by the API.
 *
 * @param {string} previewWMPref - Preview watermarking preference as passed into Preview
 * @return {string} Box API watermarking preference value
 */
export function convertWatermarkPref(previewWMPref) {
    let value = '';

    if (previewWMPref === 'all') {
        value = 'only_watermarked';
    } else if (previewWMPref === 'none') {
        value = 'only_non_watermarked';
    }

    return value;
}

/**
 * Checks whether localStorage is available or not, derived from
 * https://goo.gl/XE10Gu.
 *
 *
 * @return {boolean} Whether or not localStorage is available or not.
 */
export function isLocalStorageAvailable() {
    try {
        const x = '__storage_test__';
        localStorage.setItem(x, x);
        localStorage.removeItem(x);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Handles a blob response from axios.
 * Generates a deleted reps error on a 202 response, which has no body and is unusable.
 *
 * @param {Object} response - A response from axios
 * @return {Promise} - Resolves with the representation data, rejects with a deleted rep error
 */
export function handleRepresentationBlobFetch(response) {
    const status = getProp(response, 'status');
    if (status === 202) {
        const error = new PreviewError(ERROR_CODE.DELETED_REPS, __('error_refresh'), { isRepDeleted: true });
        return Promise.reject(error);
    }

    return Promise.resolve(response);
}
