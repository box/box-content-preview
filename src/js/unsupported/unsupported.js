'use strict';

import '../../css/unsupported/unsupported.css';
import autobind from 'autobind-decorator';
import Base from '../base';

let Box = global.Box || {};

@autobind
class Unsupported extends Base {

    /**
     * [constructor]
     *
     * @param {String|HTMLElement} container The container
     * @param {Object} options some options
     * @returns {Unsupported} Unsupported instance
     */
    constructor(container, options) {
        super(container, options);
        this.infoEl = this.containerEl.appendChild(document.createElement('div'));
        this.iconEl = this.infoEl.appendChild(document.createElement('div'));
        this.messageEl = this.infoEl.appendChild(document.createElement('div'));
        this.infoEl.className = 'box-preview-unsupported';
    }

    /**
     * Shows an unsupported message to the user.
     *
     * @public
     * @param {String} extension file extension
     * @returns {void}
     */
    load() {
        let className = 'blank';

        switch (this.options.file.extension) {
            case 'zip':
                className = 'zip';
                break;
            case 'flv':
                className = 'flv';
                break;
            default:
                className = 'blank';
        }

        this.iconEl.className = 'box-preview-file-' + className;
        this.messageEl.innerHTML = 'Not supported';

        this.loaded = true;
        this.emit('load');
    }
}

Box.Preview = Box.Preview || {};
Box.Preview.Unsupported = Unsupported;
global.Box = Box;
export default Unsupported;