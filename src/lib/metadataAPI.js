import { getHeaders } from './util';
import { METADATA } from './constants';

const { FIELD_HASXREFS, SCOPE_GLOBAL } = METADATA;

export default class MetadataAPI {
    /**
     * Gets the metadata URL given the file and template
     * @param {string} fileId - File id
     * @param {string} scope - Metadata scope
     * @param {string} template - Metadata template
     * @param {string} apiHost - API host
     * @return {string} The metadata url
     */
    static getMetadataURL(fileId, scope = SCOPE_GLOBAL, template, apiHost) {
        return `${apiHost}/2.0/files/${fileId}/metadata/${scope}/${template}`;
    }

    /** @property {Api} Previews instance of the api for XHR calls */
    api;

    /**
     * @param {Api} client - Previews instance of the api.
     */
    constructor(client) {
        this.api = client;
    }

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

        return this.getMetadata(id, SCOPE_GLOBAL, template, options).then(
            ({ [FIELD_HASXREFS]: hasXrefsValue, ...rest }) => {
                // The hasxrefs value is returned as a string 'false' or 'true' so we want
                // to convert this to a boolean
                return { ...rest, [FIELD_HASXREFS]: hasXrefsValue === 'true' };
            },
        );
    }

    /**
     * Makes network request to fetch metadata
     * @param {string} id - File id
     * @param {string} scope - Metadata template scope
     * @param {string} template - Metadata template
     * @param {Object} options - Metadata options
     * @param {Object} [options.apiHost] - api host
     * @param {Object} [options.token] - authentication token
     * @param {Object} [options.sharedLink] - shared link
     * @param {Object} [options.sharedLinkPassword] - shared link password if any
     * @return {Promise} XHR promise
     */
    getMetadata(id, scope, template, { apiHost, token, sharedLink, sharedLinkPassword }) {
        return this.api.get(MetadataAPI.getMetadataURL(id, scope, template, apiHost), {
            headers: getHeaders({}, token, sharedLink, sharedLinkPassword),
        });
    }
}
