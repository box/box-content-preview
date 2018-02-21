const DEFAULT_DOWNLOAD_HOST_PREFIX = 'https://dl.';
const PROD_CUSTOM_HOST_SUFFIX = 'boxcloud.com';
const DOWNLOAD_NOTIFICATION_SHOWN_KEY = 'download_host_notification_shown';
const DOWNLOAD_HOST_FALLBACK_KEY = 'download_host_fallback';
const NUMBERED_HOST_PREFIX_REGEX = /^https:\/\/dl\d+\./;
const CUSTOM_HOST_PREFIX_REGEX = /^https:\/\/[A-Za-z0-9]+./;

/**
 * Checks if the url is a download host, but not the default download host.
 *
 * @public
 * @param {string} downloadUrl - Content download URL, may either be a template or an actual URL
 * @return {boolean} - HTTP response
 */
export function isCustomDownloadHost(downloadUrl) {
    // A custom download host either
    // 1. begins with a numbered dl hostname
    // 2. or starts with a custom prefix and ends with boxcloud.com
    return (
        !downloadUrl.startsWith(DEFAULT_DOWNLOAD_HOST_PREFIX) &&
        (!!downloadUrl.match(NUMBERED_HOST_PREFIX_REGEX) || downloadUrl.includes(PROD_CUSTOM_HOST_SUFFIX))
    );
}

/**
 * Replaces the hostname of a download URL with the default hostname, https://dl.
 *
 * @public
 * @param {string} downloadUrl - Content download URL, may either be a template or an actual URL
 * @return {string} - The updated download URL
 */
export function replaceDownloadHostWithDefault(downloadUrl) {
    if (downloadUrl.match(NUMBERED_HOST_PREFIX_REGEX)) {
        // First check to see if we can swap a numbered dl prefix for the default
        return downloadUrl.replace(NUMBERED_HOST_PREFIX_REGEX, DEFAULT_DOWNLOAD_HOST_PREFIX);
    }

    // Otherwise replace the custom prefix with the default
    return downloadUrl.replace(CUSTOM_HOST_PREFIX_REGEX, DEFAULT_DOWNLOAD_HOST_PREFIX);
}

/**
 * Sets session storage to use the default download host.
 *
 * @public
 * @return {void}
 */
export function setDownloadHostFallback() {
    sessionStorage.setItem(DOWNLOAD_HOST_FALLBACK_KEY, 'true');
}

/**
 * Checks if we have detected a blocked download host and have decided to fall back.
 *
 * @public
 * @return {boolean} Whether the sessionStorage indicates that a download host has been blocked
 */
export function isDownloadHostBlocked() {
    return sessionStorage.getItem(DOWNLOAD_HOST_FALLBACK_KEY) === 'true';
}

/**
 * Stores the host in an array via localstorage so that we don't show a notification for it again
 *
 * @public
 * @param {string} downloadHost - Download URL host name
 * @return {void}
 */
export function setDownloadHostNotificationShown(downloadHost) {
    const shownHostsArr = JSON.parse(localStorage.getItem(DOWNLOAD_NOTIFICATION_SHOWN_KEY)) || [];
    shownHostsArr.push(downloadHost);
    localStorage.setItem(DOWNLOAD_NOTIFICATION_SHOWN_KEY, JSON.stringify(shownHostsArr));
}

/**
 * Determines what notification should be shown if needed.
 *
 * @public
 * @param {string} contentTemplate - Content download URL template
 * @return {string|undefined} Which host should we show a notification for, if any
 */
export function downloadNotificationToShow(contentTemplate) {
    const contentHost = document.createElement('a');
    contentHost.href = contentTemplate;
    const contentHostname = contentHost.hostname;
    const shownHostsArr = JSON.parse(localStorage.getItem(DOWNLOAD_NOTIFICATION_SHOWN_KEY)) || [];

    return sessionStorage.getItem(DOWNLOAD_HOST_FALLBACK_KEY) === 'true' &&
        !shownHostsArr.includes(contentHostname) &&
        isCustomDownloadHost(contentTemplate)
        ? contentHostname
        : undefined;
}

/**
 * Checks if the provided host is reachable. If not set the session storage to reflect this.
 *
 * @param {string} downloadUrl - Content download URL, may either be a template or an actual URL
 * @return {void}
 */
export function setDownloadReachability(downloadUrl) {
    return fetch(downloadUrl, { method: 'HEAD' }).catch(() => {
        setDownloadHostFallback();
    });
}
