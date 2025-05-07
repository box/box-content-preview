import DocPreloader from './DocPreloader';
import { CLASS_INVISIBLE, CLASS_BOX_PREVIEW_PRELOAD_WRAPPER_PRESENTATION } from '../../constants';
import { setDimensions } from '../../util';

class PresentationPreloader extends DocPreloader {
    /** @inheritdoc */
    maxZoomScale = 0;

    /** @inheritdoc */
    constructor(previewUI, options) {
        super(previewUI, options);

        this.wrapperClassName = CLASS_BOX_PREVIEW_PRELOAD_WRAPPER_PRESENTATION;
    }

    /**
     * Set scaled dimensions for the preload image and show. This ignores
     * number of pages since presentations are shown one page at a time.
     *
     * @override
     * @param {number} scaledWidth - Width in pixels to scale preload to
     * @param {number} scaledHeight - Height in pixels to scale preload to
     * @return {void}
     */
    scaleAndShowPreload(scaledWidth, scaledHeight) {
        if (this.checkDocumentLoaded()) {
            return;
        }

        // Set initial placeholder dimensions
        setDimensions(this.placeholderEl, scaledWidth, scaledHeight);

        // Show preload element after content is properly sized
        this.preloadEl.classList.remove(CLASS_INVISIBLE);

        // Emit message that preload has occurred
        this.emit('preload');
    }
}

export default PresentationPreloader;
