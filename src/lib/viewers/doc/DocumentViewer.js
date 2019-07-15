import DocBaseViewer from './DocBaseViewer';
import DocPreloader from './DocPreloader';
import fullscreen from '../../Fullscreen';
import './Document.scss';

class DocumentViewer extends DocBaseViewer {
    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * @inheritdoc
     */
    setup() {
        if (this.isSetup) {
            return;
        }

        // Call super() to set up common layout
        super.setup();
        this.docEl.classList.add('bp-doc-document');

        // Set up preloader
        this.preloader = new DocPreloader(this.previewUI, { api: this.api });
        this.preloader.addListener('preload', this.onPreload.bind(this));
    }

    /**
     * @inheritdoc
     */
    destroy() {
        super.destroy();
        this.preloader.removeAllListeners('preload');
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
