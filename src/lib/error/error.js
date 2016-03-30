import './error.scss';
import autobind from 'autobind-decorator';
import Base from '../base';

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
        this.iconEl = this.infoEl.appendChild(document.createElement('img'));
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
        let extension = 'blank';
        const message = reason || 'This file is either not previewable or not supported';

        // Generic errors will not have the file object
        if (this.options.file) {
            switch (this.options.file.extension) {
                case 'zip':
                    extension = 'zip';
                    break;
                case 'flv':
                    extension = 'flv';
                    break;
                default:
                    // no-op
            }
        }

        this.iconEl.src = `${this.options.location.staticBaseURI}img/files/160-${extension}.png`;
        this.messageEl.innerHTML = message;

        this.loaded = true;
        this.emit('load');
    }
}

Box.Preview = Box.Preview || {};
Box.Preview.PreviewError = PreviewError;
global.Box = Box;
export default PreviewError;
