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
 * Opens url in an iframe
 * Used for downloads
 *
 * @public
 * @param {String} api api url
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
 * @param {String} content html content
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
 * @param {String} api api url
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
 * @param {String} template  html template
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
 * @param {String} template  html template
 * @returns {void}
 */
export function insertTemplate(node, template) {
    node.appendChild(createFragment(node, template));
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
 * Builds a list of required XHR headers.
 *
 * @public
 * @param {Object} [headers] optional headers
 * @param {String} [token] optional auth token
 * @param {String} [sharedLink] optional shared link
 * @returns {Object} Headers
 */
export function getHeaders(headers = {}, token = '', sharedLink = '') {
    /* eslint-disable no-param-reassign */
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    if (sharedLink) {
        headers.BoxApi = `shared_link=${sharedLink}`;
    }
    /* eslint-enable no-param-reassign */
    return headers;
}

/**
 * Creates the content URLs
 *
 * @public
 * @param {String} url content url
 * @param {String} [token] optional auth token
 * @param {String} [sharedLink] optional shared link
 * @returns {String} content urls
 */
export function createContentUrl(url, token = '', sharedLink = '') {
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
        key = `Arrow${key}`;
    }

    if (modifier) {
        modifier += '+';
    }

    return modifier + key;
}
