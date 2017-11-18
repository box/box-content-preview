import { appendQueryParams } from './util';
import { ORIGINAL_REP_NAME } from './constants';

// List of Box Content API fields that the Preview library requires for every file. Updating this list is most likely
// a breaking change and should be done with care. Clients that leverage functionality dependent on this format
// (e.g. Box.Preview.updateFileCache()) will need to be updated if this list is modified.
const FILE_FIELDS = [
    'id',
    'permissions',
    'shared_link',
    'sha1',
    'file_version',
    'name',
    'size',
    'extension',
    'representations',
    'watermark_info',
    'authenticated_download_url'
];

/**
 * Returns the Box file Content API URL with relevant fields
 *
 * @public
 * @param {string} id - Box file ID
 * @param {string} apiHost - Box API base url
 * @return {string} API url
 */
export function getURL(id, apiHost) {
    return `${apiHost}/2.0/files/${id}?fields=${FILE_FIELDS.join(',')}`;
}

/**
 * Returns the Box file Content API URL
 *
 * @public
 * @param {string} id - Box file ID
 * @param {string} apiHost - Box API base URL
 * @return {string} API url
 */
export function getDownloadURL(id, apiHost) {
    return `${apiHost}/2.0/files/${id}?fields=download_url`;
}

/**
 * Returns the matching representation if file has it.
 *
 * @public
 * @param {Object} file - Box file
 * @param {string} repName - Name of representation
 * @return {Object|null} Maching representation object or null
 */
export function getRepresentation(file, repName) {
    return file.representations.entries.find((entry) => entry.representation === repName) || null;
}

/**
 * Is Watermarked
 *
 * @public
 * @param {Object} file - Box file
 * @return {boolean} Whether or not file is watermarked
 */
export function isWatermarked(file) {
    return !!file && !!file.watermark_info && file.watermark_info.is_watermarked;
}

/**
 * Checks permission
 *
 * @public
 * @param {Object} file - Box file
 * @param {string} operation - Action to check permission for
 * @return {boolean} Whether or not action is permitted
 */
export function checkPermission(file, operation) {
    return !!file && !!file.permissions && !!file.permissions[operation];
}

/**
 * Checks feature
 *
 * @public
 * @param {Object} viewer - Viewer instance
 * @param {string} primary - Primary feature to check
 * @param {string} [secondary] - Secondary feature to check
 * @return {boolean} Whether or not feature is available
 */
export function checkFeature(viewer, primary, secondary) {
    const available = !!viewer && typeof viewer[primary] === 'function';
    return available && (!secondary || viewer[primary](secondary));
}

/**
 * Checks whether Box File object is valid by checking whether each property
 * in FIELDS on the specified file object is defined.
 *
 * @public
 * @param {Object} file - Box File object to check
 * @return {boolean} Whether or not file metadata structure is valid
 */
export function checkFileValid(file) {
    if (!file || typeof file !== 'object') {
        return false;
    }

    return FILE_FIELDS.every((field) => typeof file[field] !== 'undefined');
}

/**
 * If the file doesn't already have an original representation, creates an
 * original representation url from the authenticated download url and adds
 * it to the file representations
 *
 * @private
 * @param {Object} file - Box file
 * @return {void}
 */
function addOriginalRepresentation(file) {
    // Don't add an original representation if it already exists
    if (getRepresentation(file, ORIGINAL_REP_NAME)) {
        return;
    }

    const queryParams = {
        preview: 'true'
    };

    if (file.file_version) {
        queryParams.version = file.file_version.id;
    }

    const template = appendQueryParams(file.authenticated_download_url, queryParams);
    file.representations.entries.push({
        content: {
            url_template: template
        },
        representation: ORIGINAL_REP_NAME,
        status: {
            state: 'success'
        }
    });
}

/**
 * Wrapper for caching a file object. Adds the faked 'ORIGINAL' representation
 * when appropraite before caching.
 *
 * @public
 * @param {Cache} cache - Cache instance
 * @param {Object} file - Box file or simple { id: fileId } object
 * @return {void}
 */
export function cacheFile(cache, file) {
    if (file.representations) {
        addOriginalRepresentation(file);
    }

    cache.set(file.id, file);
}

/**
 * Wrapper for uncaching a file object.
 *
 * @public
 * @param {Cache} cache - Cache instance
 * @param {Object} file - Box file or simple { id: fileId } object
 * @return {void}
 */
export function uncacheFile(cache, file) {
    cache.unset(file.id);
}
