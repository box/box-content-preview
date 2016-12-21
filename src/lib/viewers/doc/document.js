import autobind from 'autobind-decorator';
import pageNumTemplate from './page-num-button-content.html';
import DocBase from './doc-base';
import fullscreen from '../../fullscreen';
import {
    ICON_DROP_DOWN,
    ICON_DROP_UP,
    ICON_FULLSCREEN_IN,
    ICON_FULLSCREEN_OUT,
    ICON_ZOOM_IN,
    ICON_ZOOM_OUT
} from '../../icons/icons';
import './document.scss';

const Box = global.Box || {};

@autobind
class Document extends DocBase {

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * [constructor]
     *
     * @param {string|HTMLElement} container Container node
     * @param {Object} [options] Configuration options
     * @returns {Document} Document instance
     */
    constructor(container, options) {
        super(container, options);
        this.docEl.classList.add('box-preview-doc-document');
    }

    /**
     * Handles keyboard events for document viewer.
     *
     * @override
     * @param {string} key keydown key
     * @returns {boolean} consumed or not
     */
    onKeydown(key) {
        if (key === 'Shift++') {
            this.zoomIn();
            return true;
        } else if (key === 'Shift+_') {
            this.zoomOut();
            return true;
        } else if (key === 'ArrowUp' && fullscreen.isFullscreen(this.containerEl)) {
            this.previousPage();
            return true;
        } else if (key === 'ArrowDown' && fullscreen.isFullscreen(this.containerEl)) {
            this.nextPage();
            return true;
        }

        return super.onKeydown(key);
    }

    //--------------------------------------------------------------------------
    // Event Listeners
    //--------------------------------------------------------------------------

    /**
     * Bind event listeners for document controls
     *
     * @returns {void}
     * @private
     */
    bindControlListeners() {
        super.bindControlListeners();

        this.controls.add(__('zoom_out'), this.zoomOut, 'box-preview-doc-zoom-out-icon', ICON_ZOOM_OUT);
        this.controls.add(__('zoom_in'), this.zoomIn, 'box-preview-doc-zoom-in-icon', ICON_ZOOM_IN);

        this.controls.add(__('previous_page'), this.previousPage, 'box-preview-doc-previous-page-icon box-preview-previous-page', ICON_DROP_UP);

        const buttonContent = pageNumTemplate.replace(/>\s*</g, '><'); // removing new lines
        this.controls.add(__('enter_page_num'), this.showPageNumInput, 'box-preview-doc-page-num', buttonContent);
        this.controls.add(__('next_page'), this.nextPage, 'box-preview-doc-next-page-icon box-preview-next-page', ICON_DROP_DOWN);

        this.controls.add(__('enter_fullscreen'), this.toggleFullscreen, 'box-preview-enter-fullscreen-icon', ICON_FULLSCREEN_IN);
        this.controls.add(__('exit_fullscreen'), this.toggleFullscreen, 'box-preview-exit-fullscreen-icon', ICON_FULLSCREEN_OUT);
    }
}

Box.Preview = Box.Preview || {};
Box.Preview.Document = Document;
global.Box = Box;
export default Document;
