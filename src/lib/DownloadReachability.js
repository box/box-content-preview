import { openUrlInsideIframe, isLocalStorageAvailable } from './util';

const DEFAULT_DOWNLOAD_HOST_PREFIX = 'https://dl.';
const PROD_CUSTOM_HOST_SUFFIX = 'boxcloud.com';
const DOWNLOAD_NOTIFICATION_SHOWN_KEY = 'download_host_notification_shown';
const DOWNLOAD_HOST_FALLBACK_KEY = 'download_host_fallback';
const CUSTOM_HOST_PREFIX_REGEX = /^https:\/\/.+?\./;

let IS_STORAGE_AVAILABLE;

class DownloadReachability {
    /**
     * Checks whether localStorage and localStorage are available.
     *
     * This check is cached to not have to write/read from disk
     * every time this check is needed, but this will not catch instances where
     * localStorage/sessionStorage was available the first time this is called, but becomes
     * unavailable at a later time.
     *
     * @private
     * @return {boolean} Whether or not localStorage and sessionStorage are available or not.
     */
    static isStorageAvailable() {
        if (IS_STORAGE_AVAILABLE === undefined) {
            IS_STORAGE_AVAILABLE = isLocalStorageAvailable();
        }

        return IS_STORAGE_AVAILABLE;
    }

    /**
     * Extracts the hostname from a URL
     *
     * @param {string} downloadUrl - Content download URL, may either be a template or an actual URL
     * @return {string} The hoostname of the given URL
     */
    static getHostnameFromUrl(downloadUrl) {
        const contentHost = document.createElement('a');
        contentHost.href = downloadUrl;
        return contentHost.hostname;
    }

    /**
     * Checks if the url is a download host, but not the default download host.
     *
     * @public
     * @param {string} downloadUrl - Content download URL, may either be a template or an actual URL
     * @return {boolean} - HTTP response
     */
    static isCustomDownloadHost(downloadUrl) {
        // A custom download host:
        // 1. does not begin with the default "dl." and
        // 2. ends with boxcloud.com
        return (
            !downloadUrl.startsWith(DEFAULT_DOWNLOAD_HOST_PREFIX) && downloadUrl.indexOf(PROD_CUSTOM_HOST_SUFFIX) !== -1
        );
    }

    /**
     * Replaces the hostname of a download URL with the default hostname, https://dl.
     *
     * @public
     * @param {string} downloadUrl - Content download URL, may either be a template or an actual URL
     * @return {string} - The updated download URL
     */
    static replaceDownloadHostWithDefault(downloadUrl) {
        return downloadUrl.replace(CUSTOM_HOST_PREFIX_REGEX, DEFAULT_DOWNLOAD_HOST_PREFIX);
    }

    /**
     * Sets session storage to use the default download host.
     *
     * @public
     * @return {void}
     */
    static setDownloadHostFallback() {
        if (DownloadReachability.isStorageAvailable()) {
            sessionStorage.setItem(DOWNLOAD_HOST_FALLBACK_KEY, 'true');
        }
    }

    /**
     * Checks if we have detected a blocked download host and have decided to fall back.
     *
     * @public
     * @return {boolean} Whether the sessionStorage indicates that a download host has been blocked
     */
    static isDownloadHostBlocked() {
        if (DownloadReachability.isStorageAvailable()) {
            return sessionStorage.getItem(DOWNLOAD_HOST_FALLBACK_KEY) === 'true';
        }

        return false;
    }

    /**
     * Stores the host in an array via localstorage so that we don't show a notification for it again
     *
     * @public
     * @param {string} downloadHost - Download URL host name
     * @return {void}
     */
    static setDownloadHostNotificationShown(downloadHost) {
        if (!DownloadReachability.isStorageAvailable()) {
            return;
        }

        const shownHostsArr = JSON.parse(localStorage.getItem(DOWNLOAD_NOTIFICATION_SHOWN_KEY)) || [];
        shownHostsArr.push(downloadHost);
        localStorage.setItem(DOWNLOAD_NOTIFICATION_SHOWN_KEY, JSON.stringify(shownHostsArr));
    }

    /**
     * Determines what notification should be shown if needed.
     *
     * @public
     * @param {string} downloadUrl - Content download URL
     * @return {string|null} Which host should we show a notification for, if any
     */
    static getDownloadNotificationToShow(downloadUrl) {
        if (!DownloadReachability.isStorageAvailable()) {
            return null;
        }

        const contentHostname = DownloadReachability.getHostnameFromUrl(downloadUrl);
        const shownHostsArr = JSON.parse(localStorage.getItem(DOWNLOAD_NOTIFICATION_SHOWN_KEY)) || [];

        return sessionStorage.getItem(DOWNLOAD_HOST_FALLBACK_KEY) === 'true' &&
            !shownHostsArr.includes(contentHostname) &&
            DownloadReachability.isCustomDownloadHost(downloadUrl)
            ? contentHostname
            : null;
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
     * Checks if the provided host is reachable. If not set the session storage to reflect this.
     *
     * @param {string} downloadUrl - Content download URL, may either be a template or an actual URL
     * @return {void}
     */
    setDownloadReachability(downloadUrl) {
        return this.api
            .head(downloadUrl)
            .then(() => {
                return Promise.resolve(false);
            })
            .catch(() => {
                DownloadReachability.setDownloadHostFallback();
                return Promise.resolve(true);
            });
    }

    /**
     * Downloads file with reachability checks.
     *
     * @param {string} downloadUrl - Content download URL
     * @return {void}
     */
    downloadWithReachabilityCheck(downloadUrl) {
        const defaultDownloadUrl = DownloadReachability.replaceDownloadHostWithDefault(downloadUrl);
        if (DownloadReachability.isDownloadHostBlocked() || !DownloadReachability.isCustomDownloadHost(downloadUrl)) {
            // If we know the host is blocked, or we are already using the default,
            // use the default.
            openUrlInsideIframe(defaultDownloadUrl);
        } else {
            // Try the custom host, then check reachability
            openUrlInsideIframe(downloadUrl);
            this.setDownloadReachability(downloadUrl).then(isBlocked => {
                if (isBlocked) {
                    // If download is unreachable, try again with default
                    openUrlInsideIframe(defaultDownloadUrl);
                }
            });
        }
    }
}

export default DownloadReachability;
