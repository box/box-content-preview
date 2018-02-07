import BaseViewer from '../BaseViewer';
import { checkPermission } from '../../file';
import Browser from '../../Browser';
import { PERMISSION_DOWNLOAD } from '../../constants';
import { getIconFromExtension, getIconFromName } from '../../icons/icons';
import './PreviewError.scss';
import { VIEWER_EVENT } from '../../events';
import { stripAuthFromString } from '../../util';

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
        this.setup();

        const { file, showDownload } = this.options;
        this.icon = getIconFromName('FILE_DEFAULT');

        // Generic errors will not have the file object
        if (file) {
            switch (file.extension) {
                case 'zip':
                case 'tgz':
                case 'flv':
                    this.icon = getIconFromExtension(file.extension);
                    break;
                default:
                // no-op
            }
        }

        /* eslint-disable no-param-reassign */
        err = err instanceof Error ? err : new Error(__('error_generic'));
        /* eslint-enable no-param-reassign */

        // If there is no display message fallback to the message from above
        let displayMessage = err.displayMessage || err.message;
        displayMessage = typeof displayMessage === 'string' ? displayMessage : __('error_generic');

        this.iconEl.innerHTML = this.icon;
        this.messageEl.textContent = displayMessage;

        // Add optional download button
        if (checkPermission(file, PERMISSION_DOWNLOAD) && showDownload && Browser.canDownload()) {
            this.addDownloadButton();
        }

        this.loaded = true;

        // The error will either be the message from the original error, the displayMessage from the orignal error,
        // or the default message from the locally created error
        const errorMsg = typeof err.message === 'string' ? err.message : displayMessage;

        // Filter out any access tokens
        const filteredMsg = stripAuthFromString(errorMsg);

        this.emit(VIEWER_EVENT.load, {
            error: filteredMsg
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
        this.emit(VIEWER_EVENT.download);
    }
}

export default PreviewErrorViewer;
