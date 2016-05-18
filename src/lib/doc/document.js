/**
 * @fileoverview Document viewer for non-powerpoint documents. Extends DocBase.
 * @author tjin
 */

import './document.scss';
import autobind from 'autobind-decorator';
import DocBase from './doc-base';
import debounce from 'lodash.debounce';
import fullscreen from '../fullscreen';
import pageNumTemplate from 'raw!./page-num-button-content.html';
import {
    ICON_DROP_DOWN,
    ICON_DROP_UP,
    ICON_FULLSCREEN_IN,
    ICON_FULLSCREEN_OUT,
    ICON_ZOOM_IN,
    ICON_ZOOM_OUT
} from '../icons/icons';

const WHEEL_DEBOUNCE = 100;

const Box = global.Box || {};

@autobind
class Document extends DocBase {

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * [constructor]
     *
     * @param {String|HTMLElement} container Container node
     * @param {Object} [options] Configuration options
     * @returns {Document} Document instance
     */
    constructor(container, options) {
        super(container, options);
        this.docEl.classList.add('box-preview-doc-document');
    }

    /**
     * [destructor]
     *
     * @returns {void}
     */
    destroy() {
        if (this.docEl) {
            this.docEl.removeEventListener('wheel', this.wheelHandler());
        }

        super.destroy();
    }

    /**
     * Handles keyboard events for presentation viewer.
     *
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

    //--------------------------------------------------------------------------
    // Event Listeners
    //--------------------------------------------------------------------------

    /**
     * Binds DOM listeners for document element.
     *
     * @returns {void}
     * @private
     */
    bindDOMListeners() {
        super.bindDOMListeners();

        this.docEl.addEventListener('wheel', this.wheelHandler());
    }

    /**
     * Bind event listeners for document controls
     *
     * @returns {void}
     * @private
     */
    bindControlListeners() {
        super.bindControlListeners();

        this.controls.add(__('zoom_in'), this.zoomIn, 'box-preview-doc-zoom-in-icon', ICON_ZOOM_IN);
        this.controls.add(__('zoom_out'), this.zoomOut, 'box-preview-doc-zoom-out-icon', ICON_ZOOM_OUT);

        this.controls.add(__('previous_page'), this.previousPage, 'box-preview-doc-previous-page-icon box-preview-previous-page', ICON_DROP_UP);

        const buttonContent = pageNumTemplate.replace(/>\s*</g, '><'); // removing new lines
        this.controls.add(__('enter_page_num'), this.showPageNumInput, 'box-preview-doc-page-num', buttonContent);
        this.controls.add(__('next_page'), this.nextPage, 'box-preview-doc-next-page-icon box-preview-next-page', ICON_DROP_DOWN);

        this.controls.add(__('enter_fullscreen'), this.toggleFullscreen, 'box-preview-enter-fullscreen-icon', ICON_FULLSCREEN_IN);
        this.controls.add(__('exit_fullscreen'), this.toggleFullscreen, 'box-preview-exit-fullscreen-icon', ICON_FULLSCREEN_OUT);
    }

    /**
     * Debounced mouse wheel handler, scroll documents by page when in full
     * screen mode, and regularly when not in full screen. This needs
     * to be debounced because otherwise, the inertia scroll on Macbooks fires
     * the 'wheel' event too many times.
     *
     * @returns {void}
     * @private
     */
    wheelHandler() {
        if (!this.debouncedWheelHandler) {
            this.debouncedWheelHandler = debounce((event) => {
                // If fullscreen, scroll by page
                if (fullscreen.isFullscreen()) {
                    if (event.deltaY > 0) {
                        this.nextPage();
                    } else {
                        this.previousPage();
                    }
                }
            }, WHEEL_DEBOUNCE);
        }

        return this.debouncedWheelHandler;
    }
}

Box.Preview = Box.Preview || {};
Box.Preview.Document = Document;
global.Box = Box;
export default Document;
