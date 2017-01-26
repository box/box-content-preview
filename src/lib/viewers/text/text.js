import './text.scss';
import TextBase from './text-base';
import Browser from '../../browser';
import Popup from '../../popup';
import { CLASS_HIDDEN } from '../../constants';
import { ICON_PRINT_CHECKMARK } from '../../icons/icons';
import { HIGHLIGHTTABLE_EXTENSIONS } from './extensions';
import { get, openContentInsideIframe, createAssetUrlCreator, createStylesheet } from '../../util';

// Inline web worker JS
const HIGHLIGHT_WORKER_JS = 'onmessage=function(e){importScripts(e.data.highlightSrc);postMessage(self.hljs.highlightAuto(e.data.text).value)};';

// Only load up to 192Kb of text
const SIZE_LIMIT_BYTES = 196608;

// Time to wait before allowing user to print (we're guessing how long it takes the iframe to load)
const PRINT_TIMEOUT_MS = 5000;

const STATIC_URI = 'third-party/text/';
const JS = [`${STATIC_URI}highlight.min.js`];
const CSS = [`${STATIC_URI}github.css`];

class PlainText extends TextBase {
    /**
     * @inheritdoc
     */
    setup() {
        // Always call super 1st to have the common layout
        super.setup();

        this.textEl = this.containerEl.appendChild(document.createElement('pre'));
        this.textEl.className = 'bp-text bp-text-plain hljs';
        this.textEl.classList.add(CLASS_HIDDEN);

        this.codeEl = this.textEl.appendChild(document.createElement('code'));
        this.codeEl.classList.add(this.options.file.extension);

        // Whether or not we truncated text shown due to performance issues
        this.truncated = false;

        this.initPrint();
    }

    /**
     * Returns the name of the viewer
     *
     * @override
     * @returns {string} text
     */
    getName() {
        return 'Text';
    }

    /**
     * Returns JS assets
     *
     * @protected
     * @returns {string} text
     */
    getJS() {
        return JS;
    }

    /**
     * Returns CSS assets
     *
     * @protected
     * @returns {string} text
     */
    getCSS() {
        return CSS;
    }

    /**
     * [destructor]
     *
     * @return {void}
     */
    destroy() {
        if (this.textEl) {
            const downloadBtnEl = this.textEl.querySelector('.bp-btn-download');
            if (downloadBtnEl) {
                downloadBtnEl.removeEventListener('click', this.download.bind(this));
            }
        }

        this.printIframe = null;
        super.destroy();
    }

    /**
     * Loads a text file.
     *
     * @public
     * @return {void}
     */
    load() {
        this.setup();

        const { representation, file } = this.options;
        const { data, status } = representation;
        const { content } = data;
        const { url_template: template } = content;
        const { size, extension } = file;

        this.truncated = size > SIZE_LIMIT_BYTES;
        const headers = this.truncated ? { Range: `bytes=0-${SIZE_LIMIT_BYTES}` } : {};

        Promise.all(this.loadAssets(this.getJS(), this.getCSS()), status.getPromise()).then(() => {
            get(this.createContentUrlWithAuthParams(template), headers, 'text')
            .then((text) => {
                if (this.isDestroyed()) {
                    return;
                }

                let fetchedText = text;
                if (this.truncated) {
                    fetchedText += '...';
                }

                // Only highlight code files
                if (HIGHLIGHTTABLE_EXTENSIONS.indexOf(extension) === -1) {
                    this.finishLoading(fetchedText, false);
                } else {
                    this.initHighlightJs(fetchedText);
                }
            });
        });

        super.load();
    }

    /**
     * Prefetches assets for dash.
     *
     * @return {void}
     */
    prefetch() {
        const { url_template: template } = this.options.representation.data.content;
        this.prefetchAssets(this.getJS(), this.getCSS());
        get(this.createContentUrlWithAuthParams(template), 'any');
    }

    /**
     * Prints text using an an iframe.
     *
     * @return {void}
     */
    print() {
        if (!this.printReady) {
            this.preparePrint(this.getCSS().concat('preview.css'));

            this.printPopup.show(__('print_loading'), __('print'), () => {
                this.printPopup.hide();
                this.printIframe();
            });

            this.printPopup.disableButton();
            return;
        }

        this.printIframe();

        this.emit('printsuccess');
    }

    //--------------------------------------------------------------------------
    // Protected
    //--------------------------------------------------------------------------

    /**
     * Finishes loading after text is highlighted.
     *
     * @param {string} content - Text
     * @param {boolean} isHighlighted - Whether or not text is highlighted
     * @return {void}
     * @protected
     */
    finishLoading(content, isHighlighted) {
        // Change embed strategy based on whether or not text was highlighted
        if (isHighlighted) {
            this.codeEl.innerHTML = content;
        } else {
            this.codeEl.textContent = content;
        }

        this.loadUI();
        this.textEl.classList.remove(CLASS_HIDDEN);

        this.loaded = true;
        this.emit('load');

        // Show message that text was truncated along with a download button
        if (this.truncated) {
            this.showTruncatedDownloadButton();
        }

        // Clean up worker URL
        if (this.workerSrc) {
            URL.revokeObjectURL(this.workerSrc);
        }
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Loads highlight.js to highlight the file
     *
     * @param {string} text - The text content to load
     * @return {void}
     * @private
     */
    initHighlightJs(text) {
        const workerBlob = new Blob([HIGHLIGHT_WORKER_JS], {
            type: 'application/javascript'
        });
        this.workerSrc = URL.createObjectURL(workerBlob);
        const worker = new Worker(this.workerSrc);

        // Once highlighting is done, replace content and finish loading
        worker.onmessage = (event) => {
            this.finishLoading(event.data, true);
        };

        // Give worker location of highlight.js and text content to highlight
        const assetUrlCreator = createAssetUrlCreator(this.options.location);
        const highlightSrc = assetUrlCreator('third-party/text/highlight.min.js');
        worker.postMessage({
            highlightSrc,
            text
        });
    }

    /**
     * Sets up the print dialog.
     *
     * @return {void}
     * @private
     */
    initPrint() {
        this.printPopup = new Popup(this.containerEl);

        const printCheckmark = document.createElement('div');
        printCheckmark.className = `bp-print-check ${CLASS_HIDDEN}`;
        printCheckmark.innerHTML = ICON_PRINT_CHECKMARK.trim();

        const loadingIndicator = document.createElement('div');
        loadingIndicator.classList.add('bp-crawler');
        loadingIndicator.innerHTML = `
            <div></div>
            <div></div>
            <div></div>`.trim();

        this.printPopup.addContent(loadingIndicator, true);
        this.printPopup.addContent(printCheckmark, true);

        // Save a reference so they can be hidden or shown later.
        this.printPopup.loadingIndicator = loadingIndicator;
        this.printPopup.printCheckmark = printCheckmark;
    }

    /**
     * Sets up the print iframe - uses a web worker to insert text content and
     * styles into an iframe that can be printed.
     *
     * @param {string[]} stylesheets - Stylesheets needed for print
     * @return {void}
     * @private
     */
    preparePrint(stylesheets) {
        const assetUrlCreator = createAssetUrlCreator(this.options.location);
        this.printframe = openContentInsideIframe(this.textEl.outerHTML);
        stylesheets.forEach((stylesheet) => {
            this.printframe.contentDocument.head.appendChild(createStylesheet(assetUrlCreator(stylesheet)));
        });

        setTimeout(() => {
            if (this.printPopup) {
                // Update popup UI to reflect that print is ready
                this.printPopup.enableButton();
                this.printPopup.messageEl.textContent = __('print_ready');
                this.printPopup.loadingIndicator.classList.add(CLASS_HIDDEN);
                this.printPopup.printCheckmark.classList.remove(CLASS_HIDDEN);
            }

            this.printReady = true;
        }, PRINT_TIMEOUT_MS);
    }

    /**
     * Prints from print iframe.
     *
     * @return {void}
     * @private
     */
    printIframe() {
        this.printframe.contentWindow.focus();
        if (Browser.getName() === 'Explorer' || Browser.getName() === 'Edge') {
            this.printframe.contentWindow.document.execCommand('print', false, null);
        } else {
            this.printframe.contentWindow.print();
        }
    }

    /**
     * Shows notification that text was truncated along with download button.
     *
     * @return {void}
     * @private
     */
    showTruncatedDownloadButton() {
        const truncatedEl = document.createElement('div');
        truncatedEl.classList.add('bp-text-truncated');

        const truncatedTextEl = document.createElement('p');
        truncatedTextEl.textContent = __('text_truncated');

        const downloadBtnEl = document.createElement('button');
        downloadBtnEl.className = 'bp-btn bp-btn-primary bp-btn-download';
        downloadBtnEl.textContent = __('download_file');

        truncatedEl.appendChild(truncatedTextEl);
        truncatedEl.appendChild(downloadBtnEl);
        this.textEl.appendChild(truncatedEl);

        downloadBtnEl.addEventListener('click', this.download.bind(this));
    }

    /**
     * Emits download event
     *
     * @return {void}
     * @private
     */
    download() {
        this.emit('download');
    }
}

export default PlainText;
