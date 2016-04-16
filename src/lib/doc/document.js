import './document.scss';
import autobind from 'autobind-decorator';
import DocBase from './doc-base';
import pageNumTemplate from 'raw!./page-num-button-content.html';
import {
    ICON_DROP_DOWN,
    ICON_DROP_UP,
    ICON_FULLSCREEN_IN,
    ICON_FULLSCREEN_OUT,
    ICON_ZOOM_IN,
    ICON_ZOOM_OUT
} from '../icons/icons';

const Box = global.Box || {};

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

    /* ----- Helpers ----- */

    /**
     * Adds event listeners for document controls
     *
     * @returns {void}
     */
    addEventListenersForDocControls() {
        super.addEventListenersForDocControls();

        this.controls.add(__('zoom_in'), this.zoomIn, 'box-preview-doc-zoom-in-icon', ICON_ZOOM_IN);
        this.controls.add(__('zoom_out'), this.zoomOut, 'box-preview-doc-zoom-out-icon', ICON_ZOOM_OUT);

        this.controls.add(__('previous_page'), this.previousPage, 'box-preview-doc-previous-page-icon box-preview-previous-page', ICON_DROP_UP);

        const buttonContent = pageNumTemplate.replace(/\>\s*\</g, '><'); // removing new lines
        this.controls.add(__('enter_page_num'), this.showPageNumInput, 'box-preview-doc-page-num', buttonContent);
        this.controls.add(__('next_page'), this.nextPage, 'box-preview-doc-next-page-icon box-preview-next-page', ICON_DROP_DOWN);

        this.controls.add(__('enter_fullscreen'), this.toggleFullscreen, 'box-preview-enter-fullscreen-icon', ICON_FULLSCREEN_IN);
        this.controls.add(__('exit_fullscreen'), this.toggleFullscreen, 'box-preview-exit-fullscreen-icon', ICON_FULLSCREEN_OUT);
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
     * Handles keyboard events for presentation viewer.
     *
     * @private
     * @param {String} key keydown key
     * @returns {Boolean} consumed or not
     */
    onKeydown(key) {
        if (key === 'Shift++') {
            this.zoomIn();
            return true;
        } else if (key === 'Shift+_') {
            this.zoomOut();
            return true;
        }

        return super.onKeydown(key);
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
