import api from './api';
import { getHeaders } from './util';

// Map of extensions to global metadata template
const EXTENSIONS_TO_TEMPLATES = {
    dwg: 'autocad'
};

const MetadataAPI = {
    /**
     * Gets the global metadata template for the specified file
     * @param {string} file.id - The file id
     * @param {string} file.extension - The file extension
     * @param {Object} options - options object
     * @return {Promise} Promise is resolved or rejected based on response
     */
    get({ id, extension }, options = {}) {
        const fileType = EXTENSIONS_TO_TEMPLATES[extension];

        if (!fileType) {
            return Promise.reject(new Error(`${extension} is not a supported extension`));
        }

        const { apiHost, token } = options;

        return new Promise((resolve, reject) => {
            api
                .get(MetadataAPI.getMetadataURL(id, fileType, apiHost), { headers: getHeaders({}, token) })
                .then((response) => resolve(response))
                .catch((err) => {
                    const { response } = err;
                    // If the http response is 404, this is a valid case because the metadata template
                    // may not be initialized on the requested file. Resolve the promise with
                    // a constructed hasxrefs value
                    if (response && response.status === 404) {
                        resolve({ hasxrefs: 'false' });
                    } else {
                        reject(err);
                    }
                });
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

export default MetadataAPI;
