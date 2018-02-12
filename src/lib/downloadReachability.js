const DEFAULT_DOWNLOAD_HOST_PREFIX = 'https://dl.';
const DOWNLOAD_NOTIFICATION_SHOWN_KEY = 'download_host_notification_shown';
const DOWNLOAD_HOST_FALLBACK_KEY = 'download_host_fallback';
const DEFAULT_HOST_REGEX = /^https:\/\/dl\d+\./;

/**
 * Checks if the url is a download host, but not the default download host.
 *
 * @public
 * @param {string} downloadUrl - Content download URL, may either be a template or an actual URL
 * @return {boolean} - HTTP response
 */
export function isCustomDownloadHost(downloadUrl) {
    return (
        downloadUrl && !downloadUrl.startsWith(DEFAULT_DOWNLOAD_HOST_PREFIX) && !!downloadUrl.match(DEFAULT_HOST_REGEX)
    );
}

/**
 * Replaces the hostname of a download URL with the default hostname, https://dl.
 *
 * @private
 * @param {string} downloadUrl - Content download URL, may either be a template or an actual URL
 * @return {string} - The updated download URL
 */
export function replaceDownloadHostWithDefault(downloadUrl) {
    return downloadUrl.replace(DEFAULT_HOST_REGEX, DEFAULT_DOWNLOAD_HOST_PREFIX);
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
 * @return {string|undefined} Should the notification be shown
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
