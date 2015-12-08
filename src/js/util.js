'use strict';

/**
 * Converts a json object to query string
 * @param {Object} obj Object to change to query string
 * @returns {String} Query string
 */
export function generateQueryString(obj) {
    let keys = Object.keys(obj);
    if (keys.length === 0) {
        return '';
    }
    return '?' + Object.keys(obj).map((key) => {
        return global.encodeURIComponent(key) + '=' + global.encodeURIComponent(obj[key]);
    }).join('&');
}

/**
 * Creates the content URLs
 *
 * @protected
 * @param {String} url content url
 * @param {Object} query query
 * @returns {String} content urls
 */
export function generateContentUrl(url, query) {
    return url + generateQueryString(query);
}