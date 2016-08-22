import autobind from 'autobind-decorator';
import Base from '../../base';
import { deduceBoxUrl } from '../../util';

const Box = global.Box || {};
const LOAD_TIMEOUT_MS = 120000;

@autobind
class Office extends Base {

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
        this.iframeEl.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms');
        // Timeout for loading the preview
        this.loadTimeout = LOAD_TIMEOUT_MS;
    }

    /**
     * Loads a xlsx file
     *
     * @public
     * @returns {void}
     */
    load() {
        let src = `${deduceBoxUrl(this.options.api)}`;
        src = `${src}/integrations/officeonline/openExcelOnlinePreviewer?fileId=${this.options.file.id}`;
        this.iframeEl.src = src;
        this.loaded = true;
        this.emit('load');
        super.load();
    }
}

Box.Preview = Box.Preview || {};
Box.Preview.Office = Office;
global.Box = Box;
export default Office;
