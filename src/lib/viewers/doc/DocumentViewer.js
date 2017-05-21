import autobind from 'autobind-decorator';
import pageNumTemplate from './pageNumButtonContent.html';
import DocBaseViewer from './DocBaseViewer';
import DocPreloader from './DocPreloader';
import fullscreen from '../../Fullscreen';
import {
    ICON_DROP_DOWN,
    ICON_DROP_UP,
    ICON_FILE_DOCUMENT,
    ICON_FILE_PDF,
    ICON_FILE_SPREADSHEET,
    ICON_FILE_WORD,
    ICON_FULLSCREEN_IN,
    ICON_FULLSCREEN_OUT,
    ICON_ZOOM_IN,
    ICON_ZOOM_OUT
} from '../../icons/icons';
import './Document.scss';

const LOADING_ICON_MAP = {
    csv: ICON_FILE_SPREADSHEET,
    doc: ICON_FILE_WORD,
    docx: ICON_FILE_WORD,
    gsheet: ICON_FILE_SPREADSHEET,
    pdf: ICON_FILE_PDF,
    xls: ICON_FILE_SPREADSHEET,
    xlsm: ICON_FILE_SPREADSHEET,
    xlsx: ICON_FILE_SPREADSHEET
};

@autobind
class DocumentViewer extends DocBaseViewer {
    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * @inheritdoc
     */
    setup() {
        const fileExt = this.options.file.extension;
        this.fileLoadingIcon = LOADING_ICON_MAP[fileExt] || ICON_FILE_DOCUMENT;

        // Call super() to set up common layout
        super.setup();
        this.docEl.classList.add('bp-doc-document');

        // Set up preloader
        this.preloader = new DocPreloader();
        this.preloader.addListener('preload', () => {
            this.options.logger.setPreloaded();
            this.resetLoadTimeout(); // Some content is visible - reset load timeout
        });
    }

    /**
     * @inheritdoc
     */
    destroy() {
        super.destroy();
        this.preloader.removeAllListeners('preload');
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

        this.controls.add(
            __('previous_page'),
            this.previousPage,
            'bp-doc-previous-page-icon bp-previous-page',
            ICON_DROP_UP
        );

        const buttonContent = pageNumTemplate.replace(/>\s*</g, '><'); // removing new lines
        this.controls.add(__('enter_page_num'), this.showPageNumInput, 'bp-doc-page-num', buttonContent);
        this.controls.add(__('next_page'), this.nextPage, 'bp-doc-next-page-icon bp-next-page', ICON_DROP_DOWN);

        this.controls.add(
            __('enter_fullscreen'),
            this.toggleFullscreen,
            'bp-enter-fullscreen-icon',
            ICON_FULLSCREEN_IN
        );
        this.controls.add(__('exit_fullscreen'), this.toggleFullscreen, 'bp-exit-fullscreen-icon', ICON_FULLSCREEN_OUT);
    }
}

export default DocumentViewer;
