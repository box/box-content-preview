import React from 'react';
import { createRoot } from 'react-dom/client';
import BaseViewer from '../BaseViewer';
import ErrorIcon from './ErrorIcon';
import PreviewError from '../../PreviewError';
import { BLUEPRINT_MIGRATION_SUPPORTING_UI } from '../../constants';
import { canDownload } from '../../file';
import { ERROR_CODE, VIEWER_EVENT } from '../../events';
import { stripAuthFromString } from '../../util';
import './PreviewError.scss';

class PreviewErrorViewer extends BaseViewer {
    /**
     * @inheritdoc
     */
    constructor(options) {
        super(options);

        // Bind context for handler
        this.download = this.download.bind(this);
    }

    /**
     * @inheritdoc
     */
    setup() {
        if (this.isSetup) {
            return;
        }

        // Call super() first to set up common layout
        super.setup();

        this.infoEl = this.createViewer(document.createElement('div'));
        this.infoEl.className = 'bp-error';

        this.iconEl = this.infoEl.appendChild(document.createElement('div'));
        this.iconEl.className = 'bp-icon bp-icon-file';
        this.iconRoot = createRoot(this.iconEl);

        this.messageEl = this.infoEl.appendChild(document.createElement('p'));
        this.messageEl.className = 'bp-error-text';
    }

    /**
     * Removes the crawler and sets the file type specific loading icon
     *
     * @override
     * @return {void}
     */
    setupLoading() {
        /* no op, custom loading logic for errors */
    }

    /**
     * [destructor]
     *
     * @return {void}
     */
    destroy() {
        if (this.downloadBtnEl) {
            this.downloadBtnEl.removeEventListener('click', this.download);
        }

        if (this.iconRoot) {
            this.iconRoot.unmount();
        }

        super.destroy();
    }

    /**
     * Shows an error message to the user.
     *
     * @param {Error} err - Error that caused Preview to fail, can be a native Error object or a Preview-defined
     * PreviewError object
     * @return {void}
     */
    load(err) {
        const error =
            err instanceof PreviewError
                ? err
                : new PreviewError(ERROR_CODE.GENERIC, __('error_generic'), {}, err.message);

        const { displayMessage, details, message } = error;
        const { file } = this.options;
        const { extension: iconExtension } = file || {};

        // Display the default or file-specific error icon
        this.iconRoot.render(
            <ErrorIcon
                extension={iconExtension}
                isBlueprintEnabled={this.featureEnabled(BLUEPRINT_MIGRATION_SUPPORTING_UI)}
            />,
        );

        // Display user-friendly error message
        this.messageEl.textContent = displayMessage;

        // Add optional link or download button
        if (details && details.linkText && details.linkUrl) {
            this.addLinkButton(details.linkText, details.linkUrl);
        } else if (canDownload(file, this.options)) {
            this.addDownloadButton();
        }

        this.loaded = true;

        // Log error message - this will be the original error message if available, display message if not
        this.emit(VIEWER_EVENT.load, {
            error: stripAuthFromString(message),
        });
    }

    /**
     * Adds a link button underneath error message.
     *
     * @param {string} linkText - Translated button message
     * @param {string} linkUrl - URL for link
     * @return {void}
     */
    addLinkButton(linkText, linkUrl) {
        const linkBtnEl = this.infoEl.appendChild(document.createElement('a'));
        linkBtnEl.className = 'bp-btn bp-btn-primary';
        linkBtnEl.target = '_blank';
        linkBtnEl.textContent = linkText;
        linkBtnEl.href = linkUrl;
    }

    /**
     * Adds a download file button underneath error message.
     *
     * @private
     * @return {void}
     */
    addDownloadButton() {
        this.downloadBtnEl = this.infoEl.appendChild(document.createElement('button'));
        this.downloadBtnEl.className = 'bp-btn bp-btn-primary';
        this.downloadBtnEl.dataset.testid = 'preview-error-download-btn';
        this.downloadBtnEl.textContent = __('download');
        this.downloadBtnEl.addEventListener('click', this.download);
    }

    /**
     * Emits download event
     *
     * @private
     * @return {void}
     */
    download() {
        this.emit(VIEWER_EVENT.download);
    }
}

export default PreviewErrorViewer;
