import './presentation.scss';
import autobind from 'autobind-decorator';
import DocBase from './doc-base';
import debounce from 'lodash.debounce';
import pageNumTemplate from 'raw!./page-num-button-content.html';

import { CLASS_INVISIBLE } from '../constants';
import {
    ICON_DROP_DOWN,
    ICON_DROP_UP,
    ICON_FULLSCREEN_IN,
    ICON_FULLSCREEN_OUT
} from '../icons/icons';

const WHEEL_DEBOUNCE = 100;

const Box = global.Box || {};

/**
 * Presentation viewer for PowerPoint presentations
 *
 * @class
 * @extends DocBase
 */
@autobind
class Presentation extends DocBase {

    /**
     * @constructor
     * @param {string|HTMLElement} container Container node
     * @param {object} [options] Configuration options
     */
    constructor(container, options) {
        super(container, options);

        // Document specific class
        this.docEl.classList.add('box-preview-doc-presentation');
    }

    /**
     * Destructor
     *
     * @public
     * @returns {void}
     */
    destroy() {
        if (this.docEl) {
            this.docEl.removeEventListener('wheel', this.wheelHandler());
        }

        super.destroy();
    }

    /**
     * Go to specified page. We implement presentation mode by hiding the
     * previous current page and showing the new page.
     *
     * @param {number} pageNum Page to navigate to
     * @public
     * @returns {void}
     */
    setPage(pageNum) {
        let pageEl = this.docEl.querySelector(`[data-page-number="${this.pdfViewer.currentPageNumber}"]`);
        pageEl.classList.add(CLASS_INVISIBLE);

        super.setPage(pageNum);

        pageEl = this.docEl.querySelector(`[data-page-number="${this.pdfViewer.currentPageNumber}"]`);
        pageEl.classList.remove(CLASS_INVISIBLE);
    }

    /* ----- Private Helpers ----- */
    /**
     * Handles keyboard events for presentation viewer.
     *
     * @private
     * @param {String} key keydown key
     * @returns {Boolean} consumed or not
     */
    onKeydown(key) {
        if (key === 'ArrowDown') {
            this.nextPage();
            return true;
        } else if (key === 'ArrowUp') {
            this.previousPage();
            return true;
        }

        return super.onKeydown(key);
    }

    /**
     * Handler for 'pagesinit' event.
     *
     * @private
     * @returns {void}
     */
    pagesinitHandler() {
        // We implement presentation mode by hiding other pages except for the first page
        const pageEls = [].slice.call(this.docEl.querySelectorAll('.pdfViewer .page'), 0);
        pageEls.forEach((pageEl) => {
            if (pageEl.getAttribute('data-page-number') === '1') {
                return;
            }

            pageEl.classList.add(CLASS_INVISIBLE);
        });

        super.pagesinitHandler();
    }

    /**
     * Adds event listeners for presentation controls
     *
     * @private
     * @returns {void}
     */
    addEventListenersForDocControls() {
        super.addEventListenersForDocControls();

        this.controls.add(__('previous_page'), this.previousPage, 'box-preview-presentation-previous-page-icon box-preview-previous-page', ICON_DROP_UP);

        const buttonContent = pageNumTemplate.replace(/>\s*</g, '><'); // removing new lines
        this.controls.add(__('enter_page_num'), this.showPageNumInput, 'box-preview-doc-page-num', buttonContent);

        this.controls.add(__('next_page'), this.nextPage, 'box-preview-presentation-next-page-icon box-preview-next-page', ICON_DROP_DOWN);

        this.controls.add(__('enter_fullscreen'), this.toggleFullscreen, 'box-preview-enter-fullscreen-icon', ICON_FULLSCREEN_IN);
        this.controls.add(__('exit_fullscreen'), this.toggleFullscreen, 'box-preview-exit-fullscreen-icon', ICON_FULLSCREEN_OUT);
    }

    /**
     * Adds event listeners for document element
     *
     * @private
     * @returns {void}
     */
    addEventListenersForDocElement() {
        super.addEventListenersForDocElement();

        this.docEl.addEventListener('wheel', this.wheelHandler());
    }

    /**
     * Debounced mouse wheel handler, scroll presentations by page. This needs
     * to be debounced because otherwise, the inertia scroll on Macbooks fires
     * the 'wheel' event too many times.
     *
     * @private
     * @returns {Function} Debounced mousewheel handler
     */
    wheelHandler() {
        if (!this.debouncedWheelHandler) {
            this.debouncedWheelHandler = debounce((event) => {
                // This is used to detect whether a pagechange came from
                // scrolling or not
                this._isScrolling = true;

                if (event.deltaY > 0) {
                    this.nextPage();
                } else {
                    this.previousPage();
                }
            }, WHEEL_DEBOUNCE);
        }

        return this.debouncedWheelHandler;
    }
}

Box.Preview = Box.Preview || {};
Box.Preview.Presentation = Presentation;
global.Box = Box;
export default Presentation;
