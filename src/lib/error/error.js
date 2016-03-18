import './error.scss';
import autobind from 'autobind-decorator';
import { deduceBoxUrl } from '../util';
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
        let message = reason || 'This file is either not previewable or not supported';

        // Generic errors will not have the file object
        if (this.options.file) {
            switch (this.options.file.extension) {
                case 'zip':
                    extension = 'zip';
                    break;
                case 'flv':
                    extension = 'flv';
                    break;
                case 'boxnote':
                    extension = 'boxnote';
                    message = `<a target="_blank" href="${deduceBoxUrl(this.options.api)}/notes/${this.options.file.id}">Click here to open the Box Note</a>`;
                    break;
                case 'boxdicom':
                    extension = 'boxdicom';
                    message = `<a target="_blank" href="${deduceBoxUrl(this.options.api)}/dicom_viewer/${this.options.file.id}">Click here to open the Dicom file</a>`;
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
