import ProgressBar from './ProgressBar';
import shellTemplate from './shell.html';
import Notification from './Notification';
import { insertTemplate } from './util';
import {
    CLASS_HIDDEN,
    CLASS_INVISIBLE,
    CLASS_BOX_PREVIEW_BASE_HEADER,
    CLASS_BOX_PREVIEW_HAS_HEADER,
    CLASS_BOX_PREVIEW_HAS_NAVIGATION,
    CLASS_BOX_PREVIEW_HEADER,
    CLASS_BOX_PREVIEW_THEME_DARK,
    CLASS_PREVIEW_LOADED,
    SELECTOR_BOX_PREVIEW_CONTAINER,
    SELECTOR_BOX_PREVIEW,
    SELECTOR_BOX_PREVIEW_BTN_PRINT,
    SELECTOR_BOX_PREVIEW_BTN_DOWNLOAD,
    SELECTOR_BOX_PREVIEW_BTN_LOADING_DOWNLOAD,
    SELECTOR_BOX_PREVIEW_CRAWLER_WRAPPER,
    SELECTOR_BOX_PREVIEW_LOADING_TEXT,
    SELECTOR_BOX_PREVIEW_LOADING_WRAPPER,
    SELECTOR_BOX_PREVIEW_LOGO_CUSTOM,
    SELECTOR_BOX_PREVIEW_LOGO_DEFAULT,
    SELECTOR_NAVIGATION_LEFT,
    SELECTOR_NAVIGATION_RIGHT
} from './constants';

class PreviewUI {
    /** @property {HTMLElement} - Container element */
    container;

    /** @property {HTMLElement} - Content container element */
    contentContainer;

    /** @property {Function} - Left navigation arrow handler */
    leftHandler;

    /** @property {Function} - Right navigation arrow handler */
    rightHandler;

    /** @property {Function} - Mousemove handler */
    mousemoveHandler;

    /** @property {Function} - Keydown handler */
    keydownHandler;

    /** @property {ProgressBar} - Progress bar instance */
    progressBar;

    /**
     * Destroy preview container content.
     *
     * @public
     * @return {void}
     */
    cleanup() {
        if (this.progressBar) {
            this.progressBar.destroy();
        }

        if (this.contentContainer) {
            this.contentContainer.removeEventListener('mousemove', this.mousemoveHandler);
        }

        if (this.container) {
            this.container.innerHTML = '';
        }

        // Remove keyboard events
        document.removeEventListener('keydown', this.keydownHandler);
    }

    /**
     * Initializes the container for preview.
     *
     * @public
     * @param {Object} options - Setup options
     * @param {Function} keydown - Keydown handler
     * @param {Function} navigateLeft - Left navigation handler
     * @param {Function} navigateRight - Right navigation handler
     * @param {Function} mousemove - Mousemove handler
     * @return {HTMLElement} Preview container
     */
    setup(options, keydown, navigateLeft, navigateRight, mousemove) {
        this.container = options.container;
        this.leftHandler = navigateLeft;
        this.rightHandler = navigateRight;
        this.mousemoveHandler = mousemove;
        this.keydownHandler = keydown;

        if (typeof this.container === 'string') {
            // Get the container dom element if a selector was passed instead.
            this.container = document.querySelector(this.container);
        } else if (!this.container) {
            // Create the container if nothing was passed.
            this.container = document.body;
        }

        // Clear the content
        this.cleanup();

        // Create the preview with absolute positioning inside a relative positioned container
        // <bp-container>
        //      <bp-header>
        //      <bp>
        //      <navigation>
        // </bp-container>
        insertTemplate(this.container, shellTemplate);

        this.container = this.container.querySelector(SELECTOR_BOX_PREVIEW_CONTAINER);
        this.contentContainer = this.container.querySelector(SELECTOR_BOX_PREVIEW);

        // Setup the header, buttons, and theme
        if (options.header !== 'none') {
            this.setupHeader(options.header, options.logoUrl);
        }

        // Setup progress bar
        this.progressBar = new ProgressBar(this.container);

        // Setup loading indicator
        this.setupLoading();

        // Attach keyboard events
        document.addEventListener('keydown', this.keydownHandler);

        return this.container;
    }

    /**
     * Shows navigation arrows if there is a need
     *
     * @public
     * @param {number} id - File ID of current preview
     * @param {number[]} collection - Array of File IDs being previewed
     * @return {void}
     */
    showNavigation(id, collection) {
        // Before showing or updating navigation do some cleanup
        // that may be needed if the collection changes

        if (!this.container) {
            return;
        }

        const leftNavEl = this.container.querySelector(SELECTOR_NAVIGATION_LEFT);
        const rightNavEl = this.container.querySelector(SELECTOR_NAVIGATION_RIGHT);

        // If show navigation was called when shell is not ready then return
        if (!leftNavEl || !rightNavEl) {
            return;
        }

        // Set titles
        leftNavEl.title = __('previous_file');
        rightNavEl.title = __('next_file');

        // Hide the arrows by default
        leftNavEl.classList.add(CLASS_HIDDEN);
        rightNavEl.classList.add(CLASS_HIDDEN);
        this.contentContainer.classList.remove(CLASS_BOX_PREVIEW_HAS_NAVIGATION);

        leftNavEl.removeEventListener('click', this.leftHandler);
        rightNavEl.removeEventListener('click', this.rightHandler);
        this.contentContainer.removeEventListener('mousemove', this.mousemoveHandler);

        // Don't show navigation when there is no need
        if (collection.length < 2) {
            return;
        }

        this.contentContainer.classList.add(CLASS_BOX_PREVIEW_HAS_NAVIGATION);

        this.contentContainer.addEventListener('mousemove', this.mousemoveHandler);

        // Selectively show or hide the navigation arrows
        const index = collection.indexOf(id);

        if (index > 0) {
            leftNavEl.addEventListener('click', this.leftHandler);
            leftNavEl.classList.remove(CLASS_HIDDEN);
        }

        if (index < collection.length - 1) {
            rightNavEl.addEventListener('click', this.rightHandler);
            rightNavEl.classList.remove(CLASS_HIDDEN);
        }
    }

    /**
     * Shows the print button if the viewers implement print
     *
     * @public
     * @param {Function} handler - Print click handler
     * @return {void}
     */
    showPrintButton(handler) {
        const printButtonEl = this.container.querySelector(SELECTOR_BOX_PREVIEW_BTN_PRINT);
        if (!printButtonEl) {
            return;
        }

        printButtonEl.title = __('print');
        printButtonEl.classList.remove(CLASS_HIDDEN);
        printButtonEl.addEventListener('click', handler);
    }

    /**
     * Shows the download button if the viewers implement download
     *
     * @public
     * @param {Function} handler - Download click handler
     * @return {void}
     */
    showDownloadButton(handler) {
        const downloadButtonEl = this.container.querySelector(SELECTOR_BOX_PREVIEW_BTN_DOWNLOAD);
        if (!downloadButtonEl) {
            return;
        }

        downloadButtonEl.title = __('download');
        downloadButtonEl.classList.remove(CLASS_HIDDEN);
        downloadButtonEl.addEventListener('click', handler);
    }

    /**
     * Shows the loading download button if the viewers implement download
     *
     * @public
     * @param {Function} handler - Download click handler
     * @return {void}
     */
    showLoadingDownloadButton(handler) {
        const downloadButtonEl = this.container.querySelector(SELECTOR_BOX_PREVIEW_BTN_LOADING_DOWNLOAD);
        if (!downloadButtonEl) {
            return;
        }

        downloadButtonEl.title = __('download');
        downloadButtonEl.classList.remove(CLASS_INVISIBLE);
        downloadButtonEl.addEventListener('click', handler);
    }

    /**
     * Shows the loading indicator
     *
     * @public
     * @return {void}
     */
    showLoadingIndicator() {
        if (this.contentContainer) {
            this.contentContainer.classList.remove(CLASS_PREVIEW_LOADED);
        }
    }

    /**
     * Hides the loading indicator.
     *
     * @public
     * @return {void}
     */
    hideLoadingIndicator() {
        if (!this.contentContainer) {
            return;
        }

        this.contentContainer.classList.add(CLASS_PREVIEW_LOADED);

        // Re-show the cralwer for the next preview since it is hidden in finishLoadingSetup() in BaseViewer.js
        const crawler = this.contentContainer.querySelector(SELECTOR_BOX_PREVIEW_CRAWLER_WRAPPER);
        if (crawler) {
            crawler.classList.remove(CLASS_HIDDEN);
        }
    }

    /**
     * Shows and starts a progress bar at the top of the preview.
     *
     * @public
     * @return {void}
     */
    startProgressBar() {
        this.progressBar.start();
    }

    /**
     * Finishes and hides the top progress bar if present.
     *
     * @public
     * @return {void}
     */
    finishProgressBar() {
        this.progressBar.finish();
    }

    /**
     * Setup notification
     *
     * @public
     * @return {void}
     */
    setupNotification() {
        this.notification = new Notification(this.contentContainer);
    }

    /**
     * Shows a notification message.
     *
     * @public
     * @param {string} message - Notification message
     * @param {string} [buttonText] - Optional text to show in button
     * @return {void}
     */
    showNotification(message, buttonText) {
        if (!this.notification) {
            return;
        }

        this.notification.show(message, buttonText);
    }

    /**
     * Hides the notification message. Does nothing if the notification is already hidden.
     *
     * @public
     * @return {void}
     */
    hideNotification() {
        if (!this.notification) {
            return;
        }

        this.notification.hide();
    }

    /**
     * Replaces the currently active header with a specified header
     *
     * @public
     * @param {string} replacementHeader - Class name of new header
     * @return {void}
     */
    replaceHeader(replacementHeader) {
        const headerToShow = this.container.querySelector(replacementHeader);
        if (!headerToShow) {
            return;
        }

        // First hide all possible headers
        const headers = this.container.querySelectorAll(`.${CLASS_BOX_PREVIEW_HEADER}`);
        [].forEach.call(headers, (header) => {
            header.classList.add(CLASS_HIDDEN);
        });

        // Show the specified header
        headerToShow.classList.remove(CLASS_HIDDEN);
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------
    /**
     * Sets up the preview header.
     *
     * @private
     * @param {string} headerTheme - Header theme - either 'light' or 'dark'
     * @param {string} logoUrl - URL of logo to use
     * @return {void}
     */
    setupHeader(headerTheme, logoUrl) {
        const headerEl = this.container.firstElementChild;
        headerEl.className = `${CLASS_BOX_PREVIEW_HEADER} ${CLASS_BOX_PREVIEW_BASE_HEADER}`;
        this.contentContainer.classList.add(CLASS_BOX_PREVIEW_HAS_HEADER);

        // Setup theme, default is 'light'
        if (headerTheme === 'dark') {
            this.container.classList.add(CLASS_BOX_PREVIEW_THEME_DARK);
        }

        // Set custom logo
        if (logoUrl) {
            const defaultLogoEl = headerEl.querySelector(SELECTOR_BOX_PREVIEW_LOGO_DEFAULT);
            defaultLogoEl.classList.add(CLASS_HIDDEN);

            const customLogoEl = headerEl.querySelector(SELECTOR_BOX_PREVIEW_LOGO_CUSTOM);
            customLogoEl.src = logoUrl;
            customLogoEl.classList.remove(CLASS_HIDDEN);
        }
    }

    /**
     * Sets up preview loading indicator.
     *
     * @private
     * @return {void}
     */
    setupLoading() {
        const loadingWrapperEl = this.container.querySelector(SELECTOR_BOX_PREVIEW_LOADING_WRAPPER);
        if (!loadingWrapperEl) {
            return;
        }

        const loadingTextEl = loadingWrapperEl.querySelector(SELECTOR_BOX_PREVIEW_LOADING_TEXT);
        loadingTextEl.textContent = __('loading_preview');

        const loadingDownloadButtonEl = loadingWrapperEl.querySelector(SELECTOR_BOX_PREVIEW_BTN_LOADING_DOWNLOAD);
        loadingDownloadButtonEl.textContent = __('download_file');
    }
}

export default PreviewUI;
