import fetch from 'isomorphic-fetch';

const parseJSON = (response) => {
    if (response.status === 204) {
        return response;
    }

    return response.json();
};
const parseText = (response) => response.text();
const parseBlob = (response) => response.blob();
const parseThrough = (response) => response;

/**
 * Helper function to convert HTTP status codes into throwable errors
 *
 * @param {Response} response - fetch's Response object
 * @throws {Error} - Throws when the HTTP status is not 2XX
 * @return {Response} - Pass-thru the response if ther are no errors
 */
function checkStatus(response) {
    if (response.status >= 200 && response.status < 300) {
        return response;
    }

    const error = new Error(response.statusText);
    error.response = response;
    throw error;
}

/**
 * Wrapper function for XHR post put and delete
 *
 * @returns {Promise} xhr promise
 */
function xhr(method, url, headers = {}, data = {}) {
    return fetch(url, {
        headers,
        method,
        body: JSON.stringify(data)
    })
    .then(checkStatus)
    .then(parseJSON);
}

/**
 * Creates an empty iframe or uses an existing one
 * for the purposes of downloading or printing
 *
 * @returns {HTMLElement} iframe
 */
function createDownloadIframe() {
    let iframe = document.querySelector('#downloadiframe');
    if (!iframe) {
        // if no existing iframe create a new one
        iframe = document.createElement('iframe');
        iframe.setAttribute('id', 'downloadiframe');
        iframe.style.display = 'none';
        iframe = document.body.appendChild(iframe);
    }
    // Clean the iframe up
    iframe.contentDocument.write('<head></head><body></body>');
    return iframe;
}

/**
 * HTTP GETs a URL
 * Usage:
 *     get(url, headers, type)
 *     get(url, headers)
 *     get(url, type)
 *     get(url)
 *
 * @param {string} url - The URL to fetch
 * @param {Object} [headers] - Key-value map of headers
 * @param {string} [type] - response type json (default), text, blob or any
 * @returns {Promise} - HTTP response
 */
export function get(url, ...rest) {
    let headers;
    let type;

    if (typeof rest[0] === 'string') {
        type = rest[0];
    } else {
        headers = rest[0];
        type = rest[1];
    }

    headers = headers || {};
    type = type || 'json';

    let parser;
    switch (type) {
        case 'text':
            parser = parseText;
            break;
        case 'blob':
            parser = parseBlob;
            break;
        case 'any':
            parser = parseThrough;
            break;
        case 'json':
        default:
            parser = parseJSON;
            break;
    }

    return fetch(url, { headers })
        .then(checkStatus)
        .then(parser);
}

/**
 * HTTP POSTs a URL with JSON data
 *
 * @param {string} url - The URL to fetch
 * @param {Object} headers - Key-value map of headers
 * @param {Object} data - JS Object representation of JSON data to send
 * @returns {Promise} - HTTP response
 */
export function post(...rest) {
    return xhr('post', ...rest);
}

/**
 * HTTP PUTs a URL with JSON data
 *
 * @param {string} url - The URL to fetch
 * @param {Object} headers - Key-value map of headers
 * @param {Object} data - JS Object representation of JSON data to send
 * @returns {Promise} - HTTP response
 */
export function del(...rest) {
    return xhr('delete', ...rest);
}

/**
 * HTTP PUTs a URL with JSON data
 *
 * @param {string} url - The URL to fetch
 * @param {Object} headers - Key-value map of headers
 * @param {Object} data - JS Object representation of JSON data to send
 * @returns {Promise} - HTTP response
 */
export function put(...rest) {
    return xhr('put', ...rest);
}

/**
 * Opens url in an iframe
 * Used for downloads
 *
 * @public
 * @param {string} api api url
 * @returns {HTMLElement}
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
 * @param {string} content html content
 * @returns {HTMLElement}
 */
export function openContentInsideIframe(content) {
    const iframe = createDownloadIframe();
    iframe.contentDocument.body.innerHTML = content;
    iframe.contentDocument.close();
    return iframe;
}

/**
 * Deduces box app url from api url
 *
 * @public
 * @param {string} api api url
 * @returns {HTMLElement}
 */
export function deduceBoxUrl(api) {
    let origin;

    if (api && api.endsWith('/api')) {
        // This is an internal url
        origin = api.replace('/api', '');
        const userDomain = origin.match(/^https:\/\/(.*)\.dev\.box\.net$/);
        if (Array.isArray(userDomain) && userDomain[1]) {
            origin = `https://app.${userDomain[1]}.inside-box.net`;
        }
    } else {
        // This is an external url
        origin = 'https://app.box.com';
    }

    return origin;
}

/**
 * Creates contextual fragment
 *
 * @public
 * @param {Element} node dom node
 * @param {string} template  html template
 * @returns {HTMLElement}
 */
export function createFragment(node, template) {
    const range = document.createRange();
    range.selectNode(node);
    return range.createContextualFragment(template.replace(/>\s*</g, '><')); // remove new lines
}

/**
 * Inserts template string into dom node
 *
 * @public
 * @param {Element} node dom node
 * @param {string} template  html template
 * @returns {void}
 */
export function insertTemplate(node, template) {
    node.appendChild(createFragment(node, template));
}

/**
 * Create <script> element to load external script
 *
 * @public
 * @param {string} url  asset url
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
 * Builds a list of required XHR headers.
 *
 * @public
 * @param {Object} [headers] optional headers
 * @param {string} [token] optional auth token
 * @param {string} [sharedLink] optional shared link
 * @param {string} [password] optional shared link password
 * @returns {Object} Headers
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
    /* eslint-enable no-param-reassign */
    return headers;
}

/**
 * Creates the content URLs
 *
 * @public
 * @param {string} url content url
 * @param {string} [token] optional auth token
 * @param {string} [sharedLink] optional shared link
 * @param {string} [password] optional shared link password
 * @returns {string} content urls
 */
export function createContentUrl(url, token = '', sharedLink = '', password = '') {
    if (!token && !sharedLink) {
        return url;
    }

    let delim = '?';

    if (url.indexOf('?') > 0) {
        delim = '&';
    }

    let params = '';
    if (token) {
        params = `access_token=${token}`;
    }

    if (sharedLink) {
        if (params) {
            params = `${params}&`;
        }
        params = `${params}shared_link=${encodeURI(sharedLink)}`;
        if (password) {
            params = `${params}&shared_link_password=${encodeURI(password)}`;
        }
    }

    return `${url}${delim}${params}`;
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
        if (!head.querySelector(`link[rel="prefetch"][href="${url}"]`)) {
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
        if (!head.querySelector(`link[rel="stylesheet"][href="${url}"]`)) {
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
        if (!head.querySelector(`script[src="${url}"]`)) {
            const script = createScript(url);
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
 * @returns {string} decoded keydown key
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
 * Find location information about a script include
 *
 * @public
 * @param {string} name script name
 * @param {HTMLScriptElement} [currentScript] current script tag
 * @returns {void}
 */
export function findScriptLocation(name, currentScript = null) {
    const scriptSrc = currentScript
                        ? currentScript.src
                        : document.querySelector(`script[src*="/${name}"]`).src;

    if (!scriptSrc) {
        throw new Error('Missing or malformed preview library');
    }

    const anchor = document.createElement('a');
    anchor.href = scriptSrc;

    const pathname = anchor.pathname;
    const pathFragments = pathname.split('/');
    const fragmentLength = pathFragments.length;
    const fileName = pathFragments[fragmentLength - 1];
    const locale = pathFragments[fragmentLength - 2];
    const version = pathFragments[fragmentLength - 3];
    const query = anchor.search;
    const baseURI = anchor.href.replace(fileName, '').replace(query, '');
    const staticBaseURI = baseURI.replace(`${locale}/`, '');

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
        staticBaseURI
    };
}

/**
 * Replaces variable place holders specified between {} in the string with
 * specified custom value. Localizes strings that include variables.
 * @param  {string} string String to be interpolated
 * @param  {string[]} placeholderValues Custom values to replace into string
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
