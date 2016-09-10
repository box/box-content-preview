import autobind from 'autobind-decorator';
import Base from '../../base';
import { deduceBoxUrl } from '../../util';

const Box = global.Box || {};

@autobind
class IFrame extends Base {

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
        const sharedLink = this.options.sharedLink || '';

        const extension = this.options.file.extension;
        if (extension === 'boxnote') {
            src = `${src}/notes/${this.options.file.id}?isReadonly=1&is_preview=1`;

            // Append shared name if needed, Box Notes uses ?s=SHARED_NAME
            const sharedNameIndex = sharedLink.indexOf('/s/');
            if (sharedNameIndex !== -1) {
                const sharedName = sharedLink.substr(sharedNameIndex + 3); // shared name starts after /s/
                src = `${src}&s=${sharedName}`;
            }
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
