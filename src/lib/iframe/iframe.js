import autobind from 'autobind-decorator';
import Base from '../base';
import { deduceBoxUrl } from '../util';

const Box = global.Box || {};

@autobind
class IFrame extends Base {

    /**
     * [constructor]
     *
     * @param {String|HTMLElement} container The container
     * @param {Object} options some options
     * @returns {SWF} SWF instance
     */
    constructor(container, options) {
        super(container, options);
        this.iframeEl = this.containerEl.appendChild(document.createElement('iframe'));
        this.iframeEl.setAttribute('width', '100%');
        this.iframeEl.setAttribute('height', '100%');
        this.iframeEl.setAttribute('frameborder', 0);
        // Timeout for loading the preview
        this.loadTimeout = 120000;
    }

    /**
     * Loads a boxnote or boxdicom file
     *
     * @public
     * @returns {void}
     */
    load() {
        let src = `${deduceBoxUrl(this.options.api)}`;
        const extension = this.options.file.extension;
        if (extension === 'boxnote') {
            src = `${src}/notes/${this.options.file.id}?isReadonly=1&is_preview=1`;
        } else if (extension === 'boxdicom') {
            src = `${src}/dicom_viewer/${this.options.file.id}`;
        }
        this.iframeEl.src = src;
        this.loaded = true;
        this.emit('load');
        super.load();
    }
}

Box.Preview = Box.Preview || {};
Box.Preview.IFrame = IFrame;
global.Box = Box;
export default IFrame;
