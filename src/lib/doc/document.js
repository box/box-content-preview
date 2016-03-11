import './document.scss';
import autobind from 'autobind-decorator';
import DocBase from './doc-base';
import pageNumTemplate from 'raw!./page-num-button-content.html';

const Box = global.Box || {};

const DEFAULT_SCALE_DELTA = 1.1;
const MAX_SCALE = 10.0;
const MIN_SCALE = 0.1;

/**
 * Document viewer for non-powerpoint documents
 *
 * @class
 * @extends DocBase
 */
@autobind
class Document extends DocBase {

    /**
     * @constructor
     * @param {String|HTMLElement} container Container node
     * @param {Object} [options] Configuration options
     */
    constructor(container, options) {
        super(container, options);

        // Document specific class
        this.docEl.classList.add('box-preview-doc-document');
    }

    /**
     * Destructor
     *
     * @public
     * @returns {void}
     */
    destroy() {
        if (this.docEl) {
            this.docEl.removeEventListener('mousewheel', this.mousewheelHandler);
        }

        super.destroy();
    }

    /**
     * Zoom into document
     *
     * @param {Number} ticks Number of times to zoom in
     * @returns {void}
     */
    zoomIn(ticks = 1) {
        let numTicks = ticks;
        let newScale = this.pdfViewer.currentScale;
        do {
            newScale = (newScale * DEFAULT_SCALE_DELTA).toFixed(2);
            newScale = Math.ceil(newScale * 10) / 10;
            newScale = Math.min(MAX_SCALE, newScale);
        } while (--numTicks > 0 && newScale < MAX_SCALE);
        this.pdfViewer.currentScaleValue = newScale;

        // Redraw annotations if needed
        if (this.annotator) {
            this.annotator.setScale(this.pdfViewer.currentScale);
            this.annotator.renderAnnotations();
        }
    }

    /**
     * Zoom out of document
     *
     * @param {Number} ticks Number of times to zoom out
     * @returns {void}
     */
    zoomOut(ticks = 1) {
        let numTicks = ticks;
        let newScale = this.pdfViewer.currentScale;
        do {
            newScale = (newScale / DEFAULT_SCALE_DELTA).toFixed(2);
            newScale = Math.floor(newScale * 10) / 10;
            newScale = Math.max(MIN_SCALE, newScale);
        } while (--numTicks > 0 && newScale > MIN_SCALE);
        this.pdfViewer.currentScaleValue = newScale;

        // Redraw annotations if needed
        if (this.annotator) {
            this.annotator.setScale(this.pdfViewer.currentScale);
            this.annotator.renderAnnotations();
        }
    }

    /* ----- Helpers ----- */

    /**
     * Adds event listeners for document controls
     *
     * @returns {void}
     */
    addEventListenersForDocControls() {
        super.addEventListenersForDocControls();

        this.controls.add(__('zoom_in'), () => {
            this.zoomIn();
        }, 'box-preview-doc-zoom-in-icon');

        this.controls.add(__('zoom_out'), () => {
            this.zoomOut();
        }, 'box-preview-doc-zoom-out-icon');

        this.controls.add(__('previous_page'), this.previousPage, 'box-preview-doc-previous-page-icon box-preview-previous-page');

        const buttonContent = pageNumTemplate.replace(/\>\s*\</g, '><'); // removing new lines
        this.controls.add(__('enter_page_num'), this.showPageNumInput, 'box-preview-doc-page-num', buttonContent);

        this.controls.add(__('next_page'), this.nextPage, 'box-preview-doc-next-page-icon box-preview-next-page');

        // Annotation buttons
        if (this.options.viewers.Document && this.options.viewers.Document.annotations) {
            this.controls.add(__('add_highlight_annotation'),
                this.annotator.addHighlightAnnotationHandler, '', 'H');

            this.controls.add(__('add_point_annotation'),
                this.annotator.addPointAnnotationHandler, '', 'P');
        }

        this.controls.add(__('fullscreen'), this.toggleFullscreen, 'box-preview-doc-expand-icon');
    }

    /**
     * Adds event listeners for document element
     *
     * @returns {void}
     */
    addEventListenersForDocElement() {
        super.addEventListenersForDocElement();

        this.docEl.addEventListener('mousewheel', this.mousewheelHandler);
    }

    /**
     * Mousewheel handler, scroll documents by page when in full screen mode.
     *
     * @param {Event} event Mousewheel event
     * @returns {void}
     */
    mousewheelHandler(event) {
        // Use default mouse scroll behavior while full screen
        if (!this.pdfViewer.isInPresentationMode) {
            return;
        }

        // The mod 120 filters out track pad events. Mac inertia scrolling
        // fires lots of scroll events so we've chosen to just disable it
        const currentWheelDelta = event.wheelDelta || event.detail;
        const isFromMouseWheel = (currentWheelDelta % 120 === 0);

        if (isFromMouseWheel) {
            // Wheeldata is used for IE8 support
            // http://www.javascriptkit.com/javatutors/onmousewheel.shtml
            if (currentWheelDelta < 0) {
                this.nextPage();
            } else {
                this.previousPage();
            }
        }
    }
}

Box.Preview = Box.Preview || {};
Box.Preview.Document = Document;
global.Box = Box;
export default Document;
