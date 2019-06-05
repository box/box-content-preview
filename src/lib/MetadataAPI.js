import api from './api';
import { getHeaders } from './util';

const metadataAPI = {
    /**
     * Gets the global metadata xrefs template for the specified file
     * @param {string} id - The file id
     * @param {string} template - The global metadata template
     * @param {Object} options - options object
     * @return {Promise} Promise is resolved or rejected based on response
     */
    getXrefsMetadata(id, template, options = {}) {
        if (!id || !template) {
            return Promise.reject(new Error('id and template are required parameters'));
        }

        const { apiHost, token } = options;

        return api
            .get(metadataAPI.getMetadataURL(id, template, apiHost), { headers: getHeaders({}, token) })
            .catch((err) => {
                const { response } = err;
                // If the http response is 404, this is a valid case because the metadata template
                // may not be initialized on the requested file. Resolve the promise with
                // a constructed hasxrefs value
                if (response && response.status === 404) {
                    return Promise.resolve({ hasxrefs: 'false' });
                }

                throw err;
            });
    },

    /**
     * Gets the metadata URL given the file and template
     * @param {string} fileId - File id
     * @param {string} template - Metadata template
     * @param {string} apiHost - API host
     * @return {string} The metadata url
     */
    getMetadataURL(fileId, template, apiHost) {
        return `${apiHost}/2.0/files/${fileId}/metadata/global/${template}`;
    }
};

export default metadataAPI;
