import Browser from '../../Browser';
import DocBaseViewer from './DocBaseViewer';
import DocPreloader from './DocPreloader';
import DocFirstPreloader from './DocFirstPreloader';
import fullscreen from '../../Fullscreen';
import { OFFICE_ONLINE_EXTENSIONS } from '../../extensions';
import { getFeatureConfig } from '../../featureChecking';
import './Document.scss';

class DocumentViewer extends DocBaseViewer {
    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * @inheritdoc
     */

    docFirstPagesEnabled;

    setup() {
        if (this.isSetup) {
            return;
        }

        // Call super() to set up common layout
        super.setup();
        this.docEl.classList.add('bp-doc-document');

        // Set up preloader
        const docFirstPagesConfig = getFeatureConfig(this.options.features, 'docFirstPages');

        this.preloader = this.docFirstPagesEnabled
            ? new DocFirstPreloader(this.previewUI, { api: this.api, config: docFirstPagesConfig })
            : new DocPreloader(this.previewUI, { api: this.api });
        this.preloader.addListener('preload', this.onPreload.bind(this));

        if (this.docFirstPagesEnabled) {
            this.preloader.addListener('firstRender', this.handleFirstRender.bind(this));
        }
    }

    /**
     * Handles first render event from preloader and emits first render time metric
     *
     * @private
     * @return {void}
     */
    handleFirstRender() {
        this.emitFirstRenderMetric();
    }

    /**
     * @inheritdoc
     */
    destroy() {
        super.destroy();
        this.preloader.removeAllListeners('preload');
    }

    /**
     * @inheritdoc
     */
    load() {
        super.load();

        const { extension } = this.options.file;
        const isOfficeOnlineExtension = OFFICE_ONLINE_EXTENSIONS.includes(extension);

        if (isOfficeOnlineExtension && Browser.isIE()) {
            this.options.ui.showNotification(__('error_internet_explorer_office_online'), null, true);
        }
    }

    /**
     * Handles keyboard events for document viewer.
     *
     * @override
     * @param {string} key - Keydown key
     * @param {Object} event - Key event
     * @return {boolean} Consumed or not
     */
    onKeydown(key, event) {
        if (key === 'Shift++') {
            this.zoomIn();
            return true;
        }
        if (key === 'Shift+_') {
            this.zoomOut();
            return true;
        }
        if (key === 'ArrowUp' && fullscreen.isFullscreen(this.containerEl)) {
            this.previousPage();
            return true;
        }
        if (key === 'ArrowDown' && fullscreen.isFullscreen(this.containerEl)) {
            this.nextPage();
            return true;
        }

        return super.onKeydown(key, event);
    }

    //--------------------------------------------------------------------------
    // Event Listeners
    //--------------------------------------------------------------------------
}

export default DocumentViewer;
