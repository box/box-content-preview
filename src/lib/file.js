// List of Box Content API fields that the Preview SDK requires for every file
const FILE_FIELDS = [
    'permissions',
    'parent',
    'shared_link',
    'sha1',
    'file_version',
    'name',
    'size',
    'extension',
    'representations',
    'watermark_info'
];

/**
 * Returns the Box file Content API URL with relevant fields
 *
 * @public
 * @param {string} id Box file id
 * @param {string} api Box API base url
 * @returns {string} API url
 */
export function getURL(id, api) {
    return `${api}/2.0/files/${id}?fields=${FILE_FIELDS.join(',')}`;
}

/**
 * Returns the Box file Content API URL
 *
 * @public
 * @param {string} id Box file id
 * @param {string} api Box API base URL
 * @returns {string} API url
 */
export function getDownloadURL(id, api) {
    return `${api}/2.0/files/${id}?fields=download_url`;
}

/**
 * Is Watermarked
 *
 * @public
 * @param {object} file Box file
 * @returns {boolean} Whether or not file is watermarked
 */
export function isWatermarked(file) {
    return !!file && !!file.watermark_info && file.watermark_info.is_watermarked;
}


/**
 * Checks permission
 *
 * @public
 * @param {object} file Box file
 * @param {string} operation Action to check permission for
 * @returns {boolean} Whether or not action is permitted
 */
export function checkPermission(file, operation) {
    return !!file && !!file.permissions && !!file.permissions[operation];
}

/**
 * Checks feature
 *
 * @public
 * @param {object} viewer Viewer instance
 * @param {string} primary Primary feature to check
 * @param {string} [secondary] Secondary feature to check
 * @returns {boolean} Whether or not feature is available
 */
export function checkFeature(viewer, primary, secondary) {
    const available = !!viewer && typeof viewer[primary] === 'function';
    return available && (!secondary || viewer[primary](secondary));
}

/**
 * Checks whether file metadata is valid by checking whether each property
 * in FIELDS on the specified file object is defined.
 *
 * @public
 * @param {Object} file Box file metadata to check
 * @returns {boolean} Whether or not file metadata structure is valid
 */
export function checkFileValid(file) {
    return FILE_FIELDS.every((field) => {
        return typeof file[field] !== 'undefined';
    });
}
