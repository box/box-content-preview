import axios from 'axios';

const api = {
    /**
     * Helper function to convert an Axios error to the format Preview expects
     *
     * @private
     * @param {Object} response - Axios error response
     * @throws {Error} - Throws when an error response object exists
     * @return {void}
     */
    handleError({ response }) {
        if (response) {
            const error = new Error(response.statusText);
            error.response = response; // Need to pass response through so we can see what kind of HTTP error this was
            throw error;
        }
    },

    /**
     * Retrieves JSON from response.
     *
     * @private
     * @param {Response} response - Response to parse
     * @return {Promise|Response} Response if 204, otherwise promise that resolves with JSON
     */
    parseResponse: (response) => {
        if (response.status === 204) {
            return response;
        }

        return response.data;
    },

    /**
     * Wrapper function for XHR post put and delete
     *
     * @private
     * @param {string} url - URL for XHR
     * @param {Object} options - Request options
     * @return {Promise} XHR promise
     */
    xhr(url, { data, headers, method, responseType } = {}) {
        const config = {};

        if (data) {
            config.data = data;
        }

        if (headers) {
            config.headers = headers;
        }

        if (method) {
            config.method = method;
        }

        if (responseType) {
            config.responseType = responseType;
        }

        return axios(url, config)
            .then(api.parseResponse)
            .catch(api.handleError);
    },

    /**
     * HTTP GETs a URL
     * Usage:
     *     get(url, headers, type)
     *     get(url, headers)
     *     get(url, type)
     *     get(url)
     *
     * @public
     * @param {string} url - The URL to fetch
     * @param {Object} [headers] - Key-value map of headers
     * @param {string} [type] - response type json (default), text, blob or any
     * @return {Promise} - HTTP response
     */
    get(url, ...rest) {
        let headers;
        let responseType;

        if (typeof rest[0] === 'string') {
            responseType = rest[0];
        } else {
            headers = rest[0];
            responseType = rest[1];
        }

        headers = headers || {};
        responseType = responseType === 'any' ? 'document' : responseType || 'json';

        return api.xhr(url, { method: 'get', headers, responseType });
    },

    /**
     * HTTP HEAD a URL
     *
     * @public
     * @param {string} url - The URL to fetch
     * @param {Object} headers - Key-value map of headers
     * @return {Promise} HTTP response
     */
    head(url, headers) {
        return api.xhr(url, { method: 'head', headers });
    },

    /**
     * HTTP POSTs a URL with JSON data
     *
     * @public
     * @param {string} url - The URL to fetch
     * @param {Object} headers - Key-value map of headers
     * @param {Object} data - JS Object representation of JSON data to send
     * @return {Promise} HTTP response
     */
    post(url, headers, data) {
        return api.xhr(url, { method: 'post', headers, data });
    },

    /**
     * HTTP PUTs a URL with JSON data
     *
     * @public
     * @param {string} url - The URL to fetch
     * @param {Object} headers - Key-value map of headers
     * @param {Object} data - JS Object representation of JSON data to send
     * @return {Promise} HTTP response
     */
    del(url, headers, data) {
        return api.xhr(url, { method: 'delete', headers, data });
    },

    /**
     * HTTP PUTs a url with JSON data
     *
     * @public
     * @param {string} url - The url to fetch
     * @param {Object} headers - Key-value map of headers
     * @param {Object} data - JS Object representation of JSON data to send
     * @return {Promise} HTTP response
     */
    put(url, headers, data) {
        return api.xhr(url, { method: 'put', headers, data });
    }
};

export default api;
