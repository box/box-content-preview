import './error.scss';
import autobind from 'autobind-decorator';
import Base from '../base';
import {
    ICON_FILE_DEFAULT,
    ICON_FILE_ZIP,
    ICON_FILE_MEDIA
} from '../icons/icons';

const Box = global.Box || {};

@autobind
class PreviewError extends Base {

    /**
     * [constructor]
     *
     * @param {String|HTMLElement} container The container
     * @param {Object} options some options
     * @returns {Error} Error instance
     */
    constructor(container, options) {
        super(container, options);
        this.infoEl = this.containerEl.appendChild(document.createElement('div'));
        this.iconEl = this.infoEl.appendChild(document.createElement('div'));
        this.messageEl = this.infoEl.appendChild(document.createElement('div'));
        this.infoEl.className = 'box-preview-error';
    }

    /**
     * Shows an error message to the user.
     *
     * @public
     * @param {String} url rep to load
     * @param {String} reason error reason
     * @returns {void}
     */
    load(url, reason) {
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
        this.emit('load');
    }

    /**
     * Adds optional download button
     * @private
     * @returns {void}
     */
    addDownloadButton() {
        this.downloadEl = this.infoEl.appendChild(document.createElement('div'));
        this.downloadEl.classList.add('box-preview-error-download');
        this.downloadBtnEl = this.infoEl.appendChild(document.createElement('button'));
        this.downloadBtnEl.classList.add('box-preview-btn');
        this.downloadBtnEl.classList.add('box-preview-btn-primary');
        this.downloadBtnEl.textContent = __('download');
        this.downloadBtnEl.addEventListener('click', this.download);
    }

    /**
     * Emits download event
     * @private
     * @returns {void}
     */
    download() {
        this.emit('download');
    }

    /**
     * Destroy
     * @private
     * @returns {void}
     */
    destroy() {
        if (this.downloadBtnEl) {
            this.downloadBtnEl.removeEventListener('click', this.download);
        }
    }
}

Box.Preview = Box.Preview || {};
Box.Preview.PreviewError = PreviewError;
global.Box = Box;
export default PreviewError;
