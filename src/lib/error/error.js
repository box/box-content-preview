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
        let icon = ICON_FILE_DEFAULT;
        const message = reason || __('error_default');

        // Generic errors will not have the file object
        if (this.options.file) {
            switch (this.options.file.extension) {
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
        this.messageEl.innerHTML = message;

        this.loaded = true;
        this.emit('load');
    }
}

Box.Preview = Box.Preview || {};
Box.Preview.PreviewError = PreviewError;
global.Box = Box;
export default PreviewError;
