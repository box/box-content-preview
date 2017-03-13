import autobind from 'autobind-decorator';
import Base from '../Base';
import {
    ICON_FILE_DEFAULT,
    ICON_FILE_ZIP,
    ICON_FILE_MEDIA
} from '../../icons/icons';
import './PreviewError.scss';

@autobind
class PreviewError extends Base {

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
        this.messageEl = this.infoEl.appendChild(document.createElement('div'));
        this.infoEl.className = 'bp-error';
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
     * @param {string} reason - Error reason
     * @return {void}
     */
    load(reason) {
        this.setup();

        const file = this.options.file;
        let icon = ICON_FILE_DEFAULT;
        const message = reason || __('error_default');

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
        this.messageEl.textContent = message;

        // Add optional download button
        if (file && file.permissions && file.permissions.can_download) {
            this.addDownloadButton();
        }

        this.loaded = true;
        this.emit('load', {
            error: message
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

export default PreviewError;
