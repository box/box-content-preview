'use strict';

/**
 * Creates the content URLs
 *
 * @protected
 * @param {String} url content url
 * @param {String} [token] optional auth token
 * @returns {String} content urls
 */
export function generateContentUrl(url, token) {

    if (!token) {
        return url;
    }

    let delim = '?';

    if (url.indexOf('?') > 0) {
        delim = '&';
    }

    return url + delim + 'access_token=' + token;
}