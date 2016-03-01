import './error.scss';
import autobind from 'autobind-decorator';
import Base from '../base';

let Box = global.Box || {};

@autobind
class Error extends Base {

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
    load(url, reason = '') {
        let extension = 'blank';

        if (!reason) {
            switch (this.options.file.extension) {
                case 'zip':
                    extension = 'zip';
                    break;
                case 'flv':
                    extension = 'flv';
                    break;
                case 'boxnote':
                    extension = 'boxnote';
                    break;
                case 'boxdicom':
                    extension = 'boxdicom';
                    break;
            }
        }

        this.iconEl.src = this.options.location.staticBaseURI + 'img/files/160-' + extension + '.png';
        this.messageEl.innerHTML = reason ? reason : 'Not supported';

        this.loaded = true;
        this.emit('load');
    }
}

Box.Preview = Box.Preview || {};
Box.Preview.Error = Error;
global.Box = Box;
export default Error;
