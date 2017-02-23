import autobind from 'autobind-decorator';
import Base from '../base';
import { deduceBoxUrl } from '../../util';

const LOAD_TIMEOUT_MS = 120000;

@autobind
class Office extends Base {
    /**
     * @inheritdoc
     */
    setup() {
        // Call super() first to set up common layout
        super.setup();

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
     * @return {void}
     */
    load() {
        this.setup();

        let src = `${deduceBoxUrl(this.options.api)}/integrations/officeonline/openExcelOnlinePreviewer`;
        if (this.options.sharedLink) {
            // Find the shared or vanity name
            const sharedName = this.options.sharedLink.split('/s/')[1];
            if (sharedName) {
                src += `?s=${sharedName}&fileId=${this.options.file.id}`;
            } else {
                // Core logic in Box_Context::get_enterprise_id_from_request() expects to find the vanity link's subdomain
                // in $_GET['vanity_subdomain'], so we need to add it to src
                const tempAnchor = document.createElement('a');
                tempAnchor.href = this.options.sharedLink;
                const vanitySubdomain = tempAnchor.hostname.split('.')[0];
                const vanityName = tempAnchor.pathname.split('/v/')[1];
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

export default Office;
