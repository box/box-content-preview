import autobind from 'autobind-decorator';
import BaseViewer from '../BaseViewer';
import { checkPermission } from '../../file';
import Browser from '../../Browser';
import { PERMISSION_DOWNLOAD } from '../../constants';
import { ICON_FILE_DEFAULT, ICON_FILE_MEDIA, ICON_FILE_ZIP } from '../../icons/icons';
import './PreviewError.scss';

@autobind
class PreviewErrorViewer extends BaseViewer {
    /**
     * [constructor]
     *
     * @param {string|HTMLElement} container - The container
     * @param {Object} options - Some options
     * @return {Error} Error instance
     */
    setup() {
        // Call super() first to set up common layout
        super.setup();

        this.infoEl = this.containerEl.appendChild(document.createElement('div'));
        this.iconEl = this.infoEl.appendChild(document.createElement('div'));
        this.iconEl.className = 'bp-icon bp-icon-file';
        this.messageEl = this.infoEl.appendChild(document.createElement('div'));
        this.infoEl.className = 'bp-error';
    }

    /**
     * Removes the crawler and sets the file type specific loading icon
     *
     * @override
     * @return {void}
     */
    finishLoadingSetup() {
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

        super.destroy();
    }

    /**
     * Shows an error message to the user.
     *
     * @param {Error} err - Error
     * @return {void}
     */
    load(err) {
        // Figure out what error message to log and what error message to display
        const displayMessage = err instanceof Error && err.displayMessage ? err.displayMessage : __('error_default');

        this.setup();

        const { file, showDownload } = this.options;
        let icon = ICON_FILE_DEFAULT;

        // Generic errors will not have the file object
        if (file) {
            switch (file.extension) {
                case 'zip':
                case 'tgz':
                    icon = ICON_FILE_ZIP;
                    break;
                case 'flv':
                    icon = ICON_FILE_MEDIA;
                    break;
                default:
                // no-op
            }
        }

        this.iconEl.innerHTML = icon;
        this.messageEl.textContent = displayMessage;

        // Add optional download button
        if (checkPermission(file, PERMISSION_DOWNLOAD) && showDownload && Browser.canDownload()) {
            this.addDownloadButton();
        }

        this.loaded = true;
        this.emit('load', {
            error: err.message || displayMessage
        });
    }

    /**
     * Adds optional download button
     *
     * @private
     * @return {void}
     */
    addDownloadButton() {
        this.downloadEl = this.infoEl.appendChild(document.createElement('div'));
        this.downloadEl.classList.add('bp-error-download');
        this.downloadBtnEl = this.downloadEl.appendChild(document.createElement('button'));
        this.downloadBtnEl.classList.add('bp-btn');
        this.downloadBtnEl.classList.add('bp-btn-primary');
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
        this.emit('download');
    }
}

export default PreviewErrorViewer;
