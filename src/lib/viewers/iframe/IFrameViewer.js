import BaseViewer from '../BaseViewer';
import { VIEWER_EVENT } from '../../events';

class IFrameViewer extends BaseViewer {
    /**
     * @inheritdoc
     */
    setup() {
        if (this.isSetup) {
            return;
        }

        // Call super() to set up common layout
        super.setup();

        this.iframeEl = this.createViewer(document.createElement('iframe'));
        this.iframeEl.setAttribute('width', '100%');
        this.iframeEl.setAttribute('height', '100%');
        this.iframeEl.setAttribute('frameborder', 0);
        // Timeout for loading the preview
        this.loadTimeout = 120000;
    }

    /**
     * Loads a boxnote
     *
     * @return {void}
     */
    load() {
        let src = '';
        const { file, sharedLink = '', appHost } = this.options;
        const { extension } = file;

        if (extension === 'boxnote') {
            src = `${appHost}/notes_embedded/${file.id}?isReadonly=1&is_preview=1`;

            // Append shared name if needed, Box Notes uses ?s=SHARED_NAME
            const sharedNameIndex = sharedLink.indexOf('/s/');
            if (sharedNameIndex !== -1) {
                const sharedName = sharedLink.substr(sharedNameIndex + 3); // shared name starts after /s/
                src = `${src}&s=${sharedName}`;
            }
        }

        // Note that the load time for this will be negligible
        this.startLoadTimer();
        this.iframeEl.src = src;
        this.loaded = true;
        this.emit(VIEWER_EVENT.load);
        super.load();
    }
}

export default IFrameViewer;
