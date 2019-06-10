import api from './api';
import { getHeaders } from './util';
import { METADATA } from './constants';

const { FIELD_HASXREFS, SCOPE_GLOBAL } = METADATA;

const metadataAPI = {
    /**
     * Gets the global metadata xrefs template for the specified file
     * @param {string} id - The file id
     * @param {string} template - The global metadata template
     * @param {Object} [options] - options object
     * @return {Promise} Promise is resolved or rejected based on response
     */
    getXrefsMetadata(id, template, options = {}) {
        if (!id || !template) {
            return Promise.reject(new Error('id and template are required parameters'));
        }

        return metadataAPI.getMetadata(id, SCOPE_GLOBAL, template, options).then((response) => {
            // The hasxrefs value is returned as a string 'false' or 'true' so we want
            // to convert this to a boolean
            const { [FIELD_HASXREFS]: hasXrefsValue } = response;
            return { ...response, [FIELD_HASXREFS]: hasXrefsValue === 'true' };
        });
    },

    /**
     * Makes network request to fetch metadata
     * @param {string} id - File id
     * @param {string} scope - Metadata template scope
     * @param {string} template - Metadata template
     * @param {Object} [options] - options object
     * @return {Promise} XHR promise
     */
    getMetadata(id, scope, template, options = {}) {
        const { apiHost, token } = options;

        return api.get(metadataAPI.getMetadataURL(id, scope, template, apiHost), { headers: getHeaders({}, token) });
    },

    /**
     * Gets the metadata URL given the file and template
     * @param {string} fileId - File id
     * @param {string} scope - Metadata scope
     * @param {string} template - Metadata template
     * @param {string} apiHost - API host
     * @return {string} The metadata url
     */
    getMetadataURL(fileId, scope = SCOPE_GLOBAL, template, apiHost) {
        return `${apiHost}/2.0/files/${fileId}/metadata/${scope}/${template}`;
    }
};

export default metadataAPI;
