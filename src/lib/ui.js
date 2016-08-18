import shellTemplate from 'raw!./shell.html';
import { insertTemplate } from './util';
import {
    CLASS_HIDDEN,
    CLASS_BOX_PREVIEW_HAS_HEADER,
    CLASS_BOX_PREVIEW_HEADER,
    CLASS_BOX_PREVIEW_THEME_DARK,
    CLASS_PREVIEW_LOADED,
    SELECTOR_BOX_PREVIEW_CONTAINER,
    SELECTOR_BOX_PREVIEW,
    SELECTOR_BOX_PREVIEW_BTN_ANNOTATE,
    SELECTOR_BOX_PREVIEW_BTN_PRINT,
    SELECTOR_BOX_PREVIEW_BTN_DOWNLOAD,
    SELECTOR_NAVIGATION_LEFT,
    SELECTOR_NAVIGATION_RIGHT
} from './constants';

let container;
let contentContainer;
let leftHandler;
let rightHandler;
let mousemoveHandler;
let keydownHandler;

/**
 * Sets up the preview header.
 *
 * @param {string} headerTheme Header theme - either 'light' or 'dark'
 * @param {string} logoUrl URL of logo to use
 * @returns {void}
 * @private
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
        const defaultLogoEl = headerEl.querySelector('.box-preview-default-logo');
        defaultLogoEl.classList.add(CLASS_HIDDEN);

        const customLogoEl = headerEl.querySelector('.box-preview-custom-logo');
        customLogoEl.src = logoUrl;
        customLogoEl.classList.remove(CLASS_HIDDEN);
    }
}

/**
 * Shows navigation arrows if there is a need
 *
 * @private
 * @returns {void}
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
 * @private
 * @returns {void}
 */
export function showAnnotateButton(handler) {
    const annotateButton = container.querySelector(SELECTOR_BOX_PREVIEW_BTN_ANNOTATE);
    annotateButton.title = __('annotation_point_toggle');
    annotateButton.classList.remove(CLASS_HIDDEN);
    annotateButton.addEventListener('click', handler);
}

/**
 * Shows the print button if the viewers implement print
 *
 * @private
 * @returns {void}
 */
export function showPrintButton(handler) {
    const printButton = container.querySelector(SELECTOR_BOX_PREVIEW_BTN_PRINT);
    printButton.title = __('print');
    printButton.classList.remove(CLASS_HIDDEN);
    printButton.addEventListener('click', handler);
}

/**
 * Shows the print button if the viewers implement print
 *
 * @private
 * @returns {void}
 */
export function showDownloadButton(handler) {
    const downloadButton = container.querySelector(SELECTOR_BOX_PREVIEW_BTN_DOWNLOAD);
    downloadButton.title = __('download');
    downloadButton.classList.remove(CLASS_HIDDEN);
    downloadButton.addEventListener('click', handler);
}

/**
 * Shows the loading indicator
 *
 * @private
 * @returns {void}
 */
export function showLoadingIndicator() {
    if (contentContainer) {
        contentContainer.classList.remove(CLASS_PREVIEW_LOADED);
    }
}

/**
 * Hides the loading indicator
 *
 * @private
 * @returns {void}
 */
export function hideLoadingIndicator() {
    if (contentContainer) {
        contentContainer.classList.add(CLASS_PREVIEW_LOADED);
    }
}

/**
 * Destroy
 *
 * @private
 * @returns {void}
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
 * @private
 * @returns {void}
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
    // <box-preview-container>
    //      <box-preview-header>
    //      <box-preview>
    //      <navigation>
    // </box-preview-container>
    insertTemplate(container, shellTemplate);

    container = container.querySelector(SELECTOR_BOX_PREVIEW_CONTAINER);
    contentContainer = container.querySelector(SELECTOR_BOX_PREVIEW);

    // Setup the header, buttons, and theme
    if (options.header !== 'none') {
        setupHeader(options.header, options.logoUrl);
    }

    // Attach keyboard events
    document.addEventListener('keydown', keydownHandler);

    return container;
}
