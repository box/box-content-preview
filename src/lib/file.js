const fields = [
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
 * Returns the box file content api url
 *
 * @public
 * @param {string} id box file id
 * @param {string} api box api base url
 * @returns {string} API url
 */
export function getURL(id, api) {
    return `${api}/2.0/files/${id}?fields=${fields.join(',')}`;
}

/**
 * Returns the box file content api url
 *
 * @public
 * @param {string} id box file id
 * @param {string} api box api base url
 * @returns {string} API url
 */
export function getDownloadURL(id, api) {
    return `${api}/2.0/files/${id}?fields=download_url`;
}


/**
 * Is Watermarked
 *
 * @public
 * @param {object} file box file
 * @param {operation} operation
 * @returns {boolean} allowed or not
 */
export function isWatermarked(file) {
    return !!file && !!file.watermark_info && file.watermark_info.is_watermarked;
}


/**
 * Checks permission
 *
 * @public
 * @param {object} file box file
 * @param {operation} operation
 * @returns {boolean} allowed or not
 */
export function checkPermission(file, operation) {
    return !!file && !!file.permissions && !!file.permissions[operation];
}

/**
 * Checks feature
 *
 * @public
 * @param {object} viewer viewer instance
 * @param {string} primary operation
 * @param {string} [secondary] operation
 * @returns {boolean} available or not
 */
export function checkFeature(viewer, primary, secondary) {
    const available = !!viewer && typeof viewer[primary] === 'function';
    return available && (!secondary || viewer[primary](secondary));
}
