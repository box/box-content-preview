import autobind from 'autobind-decorator';
import Base from '../base';
import { deduceBoxUrl } from '../../util';

const Box = global.Box || {};
const LOAD_TIMEOUT_MS = 120000;

@autobind
class Office extends Base {

    /**
     * [constructor]
     *
     * @param {string|HTMLElement} container The container
     * @param {Object} options some options
     * @returns {SWF} SWF instance
     */
    constructor(container, options) {
        super(container, options);
        this.iframeEl = this.containerEl.appendChild(document.createElement('iframe'));
        this.iframeEl.setAttribute('width', '100%');
        this.iframeEl.setAttribute('height', '100%');
        this.iframeEl.setAttribute('frameborder', 0);
        this.iframeEl.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups');
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
        let src = `${deduceBoxUrl(this.options.api)}/integrations/officeonline/openExcelOnlinePreviewer`;
        if (this.options.sharedLink) {
            // Find the shared or vanity name
            const sharedName = this.options.sharedLink.split('/s/')[1];
            if (sharedName) {
                src += `?s=${sharedName}&fileId=${this.options.file.id}`;
            } else {
                const vanityUrl = this.options.sharedLink.split('/v/');
                // Core logic in Box_Context::get_enterprise_id_from_request() expects to find the vanity link's domain
                // in $_GET['vanity_subdomain'], so we need to add it to src
                const vanitySubdomain = vanityUrl[0];
                const vanityName = vanityUrl[1];
                src += `?v=${vanityName}&vanity_subdomain=${vanitySubdomain}&fileId=${this.options.file.id}`;
            }
        } else {
            src += `?fileId=${this.options.file.id}`;
        }
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
