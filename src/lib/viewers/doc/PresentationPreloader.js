import DocPreloader from './DocPreloader';
import {
    CLASS_INVISIBLE,
    CLASS_BOX_PREVIEW_PRELOAD_WRAPPER_PRESENTATION
} from '../../constants';
import { setDimensions } from '../../util';

class PresentationPreloader extends DocPreloader {
    /**
     * [constructor]
     *
     * @return {PresentationPreloader} PresentationPreloader instance
     */
    constructor(ui) {
        super(ui);
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

        setDimensions(this.imageEl, scaledWidth, scaledHeight);

        // Hide the preview-level loading indicator
        this.ui.hideLoadingIndicator();

        // Show preload element after content is properly sized
        this.preloadEl.classList.remove(CLASS_INVISIBLE);

        // Emit message that preload has occurred
        this.emit('preload');
    }
}

export default PresentationPreloader;
