'use strict';

import '../../css/unsupported/unsupported.css';
import autobind from 'autobind-decorator';
import Base from '../base';

let document = global.document;
let Promise = global.Promise;

@autobind
class Unsupported extends Base {

    /**
     * [constructor]
     * 
     * @param {string|HTMLElement} event The mousemove event
     * @param {object} [options] some options
     * @returns {Image}
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
     * @param {String} extension file extension
     * @public
     * @returns {Promise}
     */
    load() {
        return new Promise((resolve, reject) => {

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
            
            resolve(this);
            this.loaded = true;
            this.emit('load');
        });
    }
}

Box.Preview = Box.Preview || {};
Box.Preview.Unsupported = Unsupported;
global.Box = Box;
export default Unsupported;