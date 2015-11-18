'use strict';

import '../../css/doc/document.css';
import autobind from 'autobind-decorator';
import DocBase from './doc-base';

let Box = global.Box || {};
let document = global.document;

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
     * [constructor]
     * @param {string|HTMLElement} container node
     * @param {object} [options] some options
     * @returns {Document}
     */
    constructor(container, options) {
        super(container, options);

        // Document specific class
        this.docEl.classList.add('box-preview-doc-document');
    }

    /**
     * [destructor]
     * @returns {void}
     */
    destroy() {
        if (this.docEl) {
            this.docEl.removeEventListener('mousewheel', this.mousewheelHandler);
        }

        super.destroy();
    }

    /**
     * Adds event listeners for document controls
     *
     * @private
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

        this.controls.add(__('previous_page'), this.previousPage, 'box-preview-doc-previous-page-icon');
        this.controls.add(__('next_page'), this.nextPage, 'box-preview-doc-next-page-icon');

        this.controls.add(__('rotate_left'), () => {
            this.rotateLeft();
        }, 'box-preview-doc-rotate-left-icon');

        this.controls.add(__('fullscreen'), this.toggleFullscreen, 'box-preview-doc-expand-icon');
    }

    /**
     * Zoom into document
     *
     * @param {number} ticks Number of times to zoom in
     * @private
     * @returns {void}
     */
    zoomIn(ticks = 1) {
        let newScale = this.pdfViewer.currentScale;
        do {
            newScale = (newScale * DEFAULT_SCALE_DELTA).toFixed(2);
            newScale = Math.ceil(newScale * 10) / 10;
            newScale = Math.min(MAX_SCALE, newScale);
        } while (--ticks > 0 && newScale < MAX_SCALE);
        this.pdfViewer.currentScaleValue = newScale;
    }

    /**
     * Zoom out of document
     *
     * @param {number} ticks Number of times to zoom out
     * @private
     * @returns {void}
     */
    zoomOut(ticks = 1) {
        let newScale = this.pdfViewer.currentScale;
        do {
            newScale = (newScale / DEFAULT_SCALE_DELTA).toFixed(2);
            newScale = Math.floor(newScale * 10) / 10;
            newScale = Math.max(MIN_SCALE, newScale);
        } while (--ticks > 0 && newScale > MIN_SCALE);
        this.pdfViewer.currentScaleValue = newScale;
    }

    /**
     * Adds event listeners for document element
     *
     * @private
     * @returns {void}
     */
    addEventListenersForDocElement() {
        super.addEventListenersForDocElement();

        this.docEl.addEventListener('mousewheel', this.mousewheelHandler);
    }

    /**
     * Mousewheel handler, scroll documents by page when in full screen mode.
     *
     * @param {Event} event
     * @private
     * @returns {void}
     */
    mousewheelHandler(event) {
        // Use default mouse scroll behavior while full screen
        if (!this.pdfViewer.isInPresentationMode) {
            return;
        }

        // The mod 120 filters out track pad events. Mac inertia scrolling
        // fires lots of scroll events so we've chosen to just disable it
        let currentWheelDelta = event.wheelDelta || event.detail,
            isFromMouseWheel = (currentWheelDelta % 120 === 0);

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
