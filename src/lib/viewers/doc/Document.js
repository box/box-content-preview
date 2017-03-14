import autobind from 'autobind-decorator';
import pageNumTemplate from './pageNumButtonContent.html';
import DocBase from './DocBase';
import DocPreloader from './DocPreloader';
import fullscreen from '../../Fullscreen';
import { getRepresentation } from '../../file';
import { PRELOAD_REP_NAME } from '../../constants';
import {
    ICON_DROP_DOWN,
    ICON_DROP_UP,
    ICON_FULLSCREEN_IN,
    ICON_FULLSCREEN_OUT,
    ICON_ZOOM_IN,
    ICON_ZOOM_OUT
} from '../../icons/icons';
import './Document.scss';

@autobind
class Document extends DocBase {

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * @inheritdoc
     */
    setup() {
        // Call super() first to set up common layout
        super.setup();
        this.docEl.classList.add('bp-doc-document');

        // Set up preloader
        this.docPreloader = new DocPreloader();
        this.docPreloader.addListener('preload', () => {
            this.emit('preload', {
                elapsedTime: this.options.logger.getElapsedTime()
            });
        });
    }

    /**
     * @inheritdoc
     */
    destroy() {
        super.destroy();
        this.docPreloader.removeAllListeners('preload');
    }

    /**
     * @inheritdoc
     */
    showPreload() {
        // Don't show preload if there's a cached page since preloads are only for the 1st page
        if (this.getCachedPage() !== 1) {
            return;
        }

        const { file } = this.options;
        const preloadRep = getRepresentation(file, PRELOAD_REP_NAME);
        if (!preloadRep || !this.getViewerOption('preload')) {
            return;
        }

        const { url_template: template } = preloadRep.content;
        const preloadUrlWithAuth = this.createContentUrlWithAuthParams(template);
        this.docPreloader.showPreload(preloadUrlWithAuth, this.containerEl);
    }

    /**
     * @inheritdoc
     */
    hidePreload() {
        this.docPreloader.hidePreload();
    }

    /**
     * Handles keyboard events for document viewer.
     *
     * @override
     * @param {string} key - Keydown key
     * @return {boolean} Consumed or not
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
     * @private
     * @return {void}
     */
    bindControlListeners() {
        super.bindControlListeners();

        this.controls.add(__('zoom_out'), this.zoomOut, 'bp-doc-zoom-out-icon', ICON_ZOOM_OUT);
        this.controls.add(__('zoom_in'), this.zoomIn, 'bp-doc-zoom-in-icon', ICON_ZOOM_IN);

        this.controls.add(__('previous_page'), this.previousPage, 'bp-doc-previous-page-icon bp-previous-page', ICON_DROP_UP);

        const buttonContent = pageNumTemplate.replace(/>\s*</g, '><'); // removing new lines
        this.controls.add(__('enter_page_num'), this.showPageNumInput, 'bp-doc-page-num', buttonContent);
        this.controls.add(__('next_page'), this.nextPage, 'bp-doc-next-page-icon bp-next-page', ICON_DROP_DOWN);

        this.controls.add(__('enter_fullscreen'), this.toggleFullscreen, 'bp-enter-fullscreen-icon', ICON_FULLSCREEN_IN);
        this.controls.add(__('exit_fullscreen'), this.toggleFullscreen, 'bp-exit-fullscreen-icon', ICON_FULLSCREEN_OUT);
    }
}

export default Document;
