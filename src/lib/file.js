import { getProp, appendQueryParams } from './util';
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
 * @param {string} fileId - Box file ID
 * @param {string} fileVersionId - Box file version ID
 * @param {string} apiHost - Box API base url
 * @return {string} API url
 */
export function getURL(fileId, fileVersionId, apiHost) {
    const versionFrag = fileVersionId ? `/versions/${fileVersionId}` : '';
    return `${apiHost}/2.0/files/${fileId}${versionFrag}?fields=${FILE_FIELDS.join(',')}`;
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
    return getProp(file, 'watermark_info.is_watermarked', false);
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
    return getProp(file, `permissions.${operation}`, false);
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
 * Normalizes a file version object from the API to a file object with the
 * appropriate file version info that Preview expects.
 *
 * @param {Object} fileVersion - File version object from API
 * @param {Object} fileId - File ID
 * @return {Object} File version object normalized to a file object from the API
 */
export function normalizeFileVersion(fileVersion, fileId) {
    const file = Object.assign({}, fileVersion);
    file.id = fileId; // ID returned by file versions API is file version ID, so we need to set to file ID
    file.shared_link = {}; // File versions API does not return shared link object
    file.file_version = {
        type: 'file_version',
        id: fileVersion.id,
        sha1: fileVersion.sha1
    };

    return file;
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
 * Helper to get cache key based on file ID or file version ID. Pass in one or the other.
 *
 * @param {Object} options - Cache key options
 * @param {string} fileId - Get cache key by file ID
 * @param {string} fileVersionId - Get cache key by file version ID
 * @return {string} Cache key to use
 */
export function getFileCacheKey({ fileId, fileVersionId }) {
    if (fileId) {
        return `file_${fileId}`;
    } else if (fileVersionId) {
        return `file_version_${fileVersionId}`;
    }

    return '';
}

/**
 * Wrapper for caching a file object. Because we need to be backwards compatible with Preview before it supported
 * previews of non-current file versions, we cache file objects twice - once with the file ID as the key and once with
 * the file version ID as the key. This will allow us look up files by either primary key.
 *
 * @public
 * @param {Cache} cache - Cache instance
 * @param {Object} file - Box file object
 * @return {void}
 */
export function cacheFile(cache, file) {
    // Don't cache watermarked files
    if (isWatermarked(file)) {
        return;
    }

    // Some viewers require the original file for preview, so this adds a faked 'ORIGINAL' representation
    if (file.representations) {
        addOriginalRepresentation(file);
    }

    // Cache using file ID as a key
    cache.set(getFileCacheKey({ fileId: file.id }), file);

    // Cache using file version ID as key
    if (file.file_version && file.file_version.id) {
        cache.set(getFileCacheKey({ fileVersionId: file.file_version.id }), file);
    }
}

/**
 * Wrapper for uncaching a file object. We uncache both the key by file ID and the key by file version ID.
 *
 * @public
 * @param {Cache} cache - Cache instance
 * @param {Object} file - Box file or simple { id: fileId } object
 * @return {void}
 */
export function uncacheFile(cache, file) {
    cache.unset(getFileCacheKey({ fileId: file.id }));

    if (file.file_version && file.file_version.id) {
        cache.unset(getFileCacheKey({ fileVersionId: file.file_version.id }));
    }
}

/**
 * Helper to retrieve a cached file object. They key can be either file ID or file version ID, but not both.
 *
 * @public
 * @param {Cache} cache - Cache instance
 * @param {Object} options - File key options
 * @param {string} options.fileId - Box file ID
 * @param {string} options.fileVersionId - Box file version ID
 * @return {Object|null} Box file object
 */
export function getCachedFile(cache, { fileId, fileVersionId }) {
    if (fileId && !fileVersionId) {
        return cache.get(getFileCacheKey({ fileId }));
    } else if (fileVersionId) {
        return cache.get(getFileCacheKey({ fileVersionId }));
    }

    return null;
}
