import shellTemplate from './shell.html';
import { insertTemplate } from './util';
import {
    CLASS_HIDDEN,
    CLASS_INVISIBLE,
    CLASS_BOX_PREVIEW_HAS_HEADER,
    CLASS_BOX_PREVIEW_HEADER,
    CLASS_BOX_PREVIEW_THEME_DARK,
    CLASS_PREVIEW_LOADED,
    SELECTOR_BOX_PREVIEW_CONTAINER,
    SELECTOR_BOX_PREVIEW,
    SELECTOR_BOX_PREVIEW_BTN_ANNOTATE,
    SELECTOR_BOX_PREVIEW_BTN_PRINT,
    SELECTOR_BOX_PREVIEW_BTN_DOWNLOAD,
    SELECTOR_BOX_PREVIEW_BTN_LOADING_DOWNLOAD,
    SELECTOR_BOX_PREVIEW_ICON,
    SELECTOR_BOX_PREVIEW_LOADING_TEXT,
    SELECTOR_BOX_PREVIEW_LOADING_WRAPPER,
    SELECTOR_BOX_PREVIEW_LOGO_CUSTOM,
    SELECTOR_BOX_PREVIEW_LOGO_DEFAULT,
    SELECTOR_NAVIGATION_LEFT,
    SELECTOR_NAVIGATION_RIGHT
} from './constants';
import { ICON_FILE_DEFAULT } from './icons/icons';

let container;
let contentContainer;
let leftHandler;
let rightHandler;
let mousemoveHandler;
let keydownHandler;

/**
 * Sets up the preview header.
 *
 * @private
 * @param {string} headerTheme - Header theme - either 'light' or 'dark'
 * @param {string} logoUrl - URL of logo to use
 * @return {void}
 */
function setupHeader(headerTheme, logoUrl) {
    const headerEl = container.firstElementChild;
    headerEl.className = CLASS_BOX_PREVIEW_HEADER;
    contentContainer.classList.add(CLASS_BOX_PREVIEW_HAS_HEADER);

    // Setup theme, default is 'light'
    if (headerTheme === 'dark') {
        container.classList.add(CLASS_BOX_PREVIEW_THEME_DARK);
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
function setupLoading() {
    const loadingWrapperEl = container.querySelector(SELECTOR_BOX_PREVIEW_LOADING_WRAPPER);
    if (!loadingWrapperEl) {
        return;
    }

    const iconWrapperEl = loadingWrapperEl.querySelector(SELECTOR_BOX_PREVIEW_ICON);
    iconWrapperEl.innerHTML = ICON_FILE_DEFAULT;

    const loadingTextEl = loadingWrapperEl.querySelector(SELECTOR_BOX_PREVIEW_LOADING_TEXT);
    loadingTextEl.textContent = __('generating_preview');

    const loadingDownloadButtonEl = loadingWrapperEl.querySelector(SELECTOR_BOX_PREVIEW_BTN_LOADING_DOWNLOAD);
    loadingDownloadButtonEl.textContent = __('download_file');
}

/**
 * Destroy preview container content.
 *
 * @return {void}
 */
export function cleanup() {
    if (contentContainer) {
        contentContainer.removeEventListener('mousemove', mousemoveHandler);
    }

    if (container) {
        container.innerHTML = '';
    }

    // Remove keyboard events
    document.removeEventListener('keydown', keydownHandler);
}

/**
 * Initializes the container for preview.
 *
 * @param {Object} options - Setup options
 * @param {Function} keydown - Keydown handler
 * @param {Function} navigateLeft - Left navigation handler
 * @param {Function} navigateRight - Right navigation handler
 * @param {Function} mousemove - Mousemove handler
 * @return {HTMLElement} Preview container
 */
export function setup(options, keydown, navigateLeft, navigateRight, mousemove) {
    container = options.container;
    leftHandler = navigateLeft;
    rightHandler = navigateRight;
    mousemoveHandler = mousemove;
    keydownHandler = keydown;

    if (typeof container === 'string') {
        // Get the container dom element if a selector was passed instead.
        container = document.querySelector(container);
    } else if (!container) {
        // Create the container if nothing was passed.
        container = document.body;
    }

    // Clear the content
    cleanup();

    // Create the preview with absolute positioning inside a relative positioned container
    // <bp-container>
    //      <bp-header>
    //      <bp>
    //      <navigation>
    // </bp-container>
    insertTemplate(container, shellTemplate);

    container = container.querySelector(SELECTOR_BOX_PREVIEW_CONTAINER);
    contentContainer = container.querySelector(SELECTOR_BOX_PREVIEW);

    // Setup the header, buttons, and theme
    if (options.header !== 'none') {
        setupHeader(options.header, options.logoUrl);
    }

    // Setup loading indicator
    setupLoading();

    // Attach keyboard events
    document.addEventListener('keydown', keydownHandler);

    return container;
}

/**
 * Shows navigation arrows if there is a need
 *
 * @param {number} id - File ID of current preview
 * @param {number[]} collection - Array of File IDs being previewed
 * @return {void}
 */
export function showNavigation(id, collection) {
    // Before showing or updating navigation do some cleanup
    // that may be needed if the collection changes

    if (!container) {
        return;
    }

    const leftNavEl = container.querySelector(SELECTOR_NAVIGATION_LEFT);
    const rightNavEl = container.querySelector(SELECTOR_NAVIGATION_RIGHT);

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

    leftNavEl.removeEventListener('click', leftHandler);
    rightNavEl.removeEventListener('click', rightHandler);
    contentContainer.removeEventListener('mousemove', mousemoveHandler);

    // Don't show navigation when there is no need
    if (collection.length < 2) {
        return;
    }

    leftNavEl.addEventListener('click', leftHandler);
    rightNavEl.addEventListener('click', rightHandler);
    contentContainer.addEventListener('mousemove', mousemoveHandler);

    // Selectively show or hide the navigation arrows
    const index = collection.indexOf(id);

    if (index > 0) {
        leftNavEl.classList.remove(CLASS_HIDDEN);
    }

    if (index < collection.length - 1) {
        rightNavEl.classList.remove(CLASS_HIDDEN);
    }
}

/**
 * Shows the point annotate button if the viewers implement annotations
 *
 * @param {Function} handler - Annotation button handler
 * @return {void}
 */
export function showAnnotateButton(handler) {
    const annotateButtonEl = container.querySelector(SELECTOR_BOX_PREVIEW_BTN_ANNOTATE);
    if (!annotateButtonEl) {
        return;
    }

    annotateButtonEl.title = __('annotation_point_toggle');
    annotateButtonEl.classList.remove(CLASS_HIDDEN);
    annotateButtonEl.addEventListener('click', handler);
}

/**
 * Shows the print button if the viewers implement print
 *
 * @param {Function} handler - Print click handler
 * @return {void}
 */
export function showPrintButton(handler) {
    const printButtonEl = container.querySelector(SELECTOR_BOX_PREVIEW_BTN_PRINT);
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
 * @param {Function} handler - Download click handler
 * @return {void}
 */
export function showDownloadButton(handler) {
    const downloadButtonEl = container.querySelector(SELECTOR_BOX_PREVIEW_BTN_DOWNLOAD);
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
 * @param {Function} handler - Download click handler
 * @return {void}
 */
export function showLoadingDownloadButton(handler) {
    const downloadButtonEl = container.querySelector(SELECTOR_BOX_PREVIEW_BTN_LOADING_DOWNLOAD);
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
 * @private
 * @return {void}
 */
export function showLoadingIndicator() {
    if (contentContainer) {
        contentContainer.classList.remove(CLASS_PREVIEW_LOADED);
    }
}

/**
 * Hides the loading indicator.
 *
 * @return {void}
 */
export function hideLoadingIndicator() {
    if (contentContainer) {
        contentContainer.classList.add(CLASS_PREVIEW_LOADED);
    }
}
