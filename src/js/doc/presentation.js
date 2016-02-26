import './presentation.scss';
import autobind from 'autobind-decorator';
import DocBase from './doc-base';
import pageNumTemplate from 'raw!../../html/doc/page-num-button-content.html';

let Box = global.Box || {};

const DEFAULT_SCALE_DELTA = 1.1;
const MAX_SCALE = 10.0;
const MIN_SCALE = 0.1;

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
            this.docEl.removeEventListener('mousewheel', this.mousewheelHandler);
        }

        super.destroy();
    }

    /*----- Private Helpers -----*/

    /**
     * Adds event listeners for presentation controls
     *
     * @private
     * @returns {void}
     */
    addEventListenersForDocControls() {
        super.addEventListenersForDocControls();

        this.controls.add(__('previous_page'), this.previousPage, 'box-preview-presentation-previous-page-icon box-preview-previous-page');

        let buttonContent = pageNumTemplate.replace(/\>\s*\</g, '><'); // removing new lines
        this.controls.add(__('enter_page_num'), this.showPageNumInput, 'box-preview-doc-page-num', buttonContent);

        this.controls.add(__('next_page'), this.nextPage, 'box-preview-presentation-next-page-icon box-preview-next-page');
        this.controls.add(__('fullscreen'), this.toggleFullscreen, 'box-preview-doc-expand-icon');
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
     * Mousewheel handler, scroll presentations by page.
     *
     * @param {Event} event Mousewheel event
     * @private
     * @returns {void}
     */
    mousewheelHandler(event) {
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
Box.Preview.Presentation = Presentation;
global.Box = Box;
export default Presentation;
