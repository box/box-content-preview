import DocPreloader from './DocPreloader';
import { CLASS_INVISIBLE, CLASS_BOX_PREVIEW_PRELOAD_WRAPPER_PRESENTATION } from '../../constants';
import { setDimensions } from '../../util';

class PresentationPreloader extends DocPreloader {
    /**
     * @property {HTMLELement} - Maximum auto-zoom scale, set to 0 for no limit since presentation viewer doesn't
     * have a maximum zoom scale and scales up to available viewport
     */
    maxZoomScale = 0;

    /** @property {HTMLElement} - Preload container element */
    preloadEl;

    /** @property {PreviewUI} - Preview's UI instance */
    previewUI;

    /** @property {string} - Class name for preload wrapper */
    wrapperClassName;

    /**
     * [constructor]
     *
     * @param {PreviewUI} previewUI - UI instance
     * @return {PresentationPreloader} PresentationPreloader instance
     */
    constructor(previewUI) {
        super(previewUI);

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
        setDimensions(this.overlayEl, scaledWidth, scaledHeight);

        // Hide the preview-level loading indicator
        this.previewUI.hideLoadingIndicator();

        // Show preload element after content is properly sized
        this.preloadEl.classList.remove(CLASS_INVISIBLE);

        // Emit message that preload has occurred
        this.emit('preload');
    }
}

export default PresentationPreloader;
