'use strict';

import autobind from 'autobind-decorator';
import Base from './base';
import 'file?name=160-zip.png!../img/files_160/160-zip.png';
import 'file?name=160-blank.png!../img/files_160/160-blank.png';

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
        this.messageEl = this.containerEl.appendChild(document.createElement('div'));
    }

    /**
     * Shows an unsupported message to the user.
     *
     * @param {String} extension file extension
     * @public
     * @returns {Promise}
     */
    load(extension) {
        return new Promise((resolve, reject) => {
            resolve(this);
            this.messageEl.innerHTML = '<img src="/160-blank.png"/>Not supported';
            this.loaded = true;
            this.emit('load');
        });
    }
}

export default Unsupported;