import Browser from '../../Browser';
import Popup from '../../Popup';
import TextBaseViewer from './TextBaseViewer';
import { BROWSERS, CLASS_HIDDEN, CLASS_IS_SCROLLABLE, TEXT_STATIC_ASSETS_VERSION } from '../../constants';
import { ICON_PRINT_CHECKMARK } from '../../icons';
import { HIGHLIGHTTABLE_EXTENSIONS } from '../../extensions';
import { openContentInsideIframe, createAssetUrlCreator, createStylesheet } from '../../util';
import { VIEWER_EVENT } from '../../events';
import './PlainText.scss';

// Inline web worker JS
const HIGHLIGHT_WORKER_JS =
    'onmessage=function(e){importScripts(e.data.highlightSrc);postMessage(self.hljs.highlightAuto(e.data.text).value)};';

// Only load up to 192Kb of text
const SIZE_LIMIT_BYTES = 196608;

// Time to wait before allowing user to print (we're guessing how long it takes the iframe to load)
const PRINT_TIMEOUT_MS = 5000;

const STATIC_URI = `third-party/text/${TEXT_STATIC_ASSETS_VERSION}/`;
const JS = [`${STATIC_URI}highlight.min.js`];
const CSS = [`${STATIC_URI}github.min.css`];

class PlainTextViewer extends TextBaseViewer {
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
     * Loads aseets and then a text file.
     *
     * @return {Promise} to load text representation and assets
     */
    load() {
        super.load();

        const loadAssetsPromise = this.loadAssets(this.getJS(), this.getCSS());
        return Promise.all([loadAssetsPromise, this.getRepStatus().getPromise()])
            .then(this.postLoad)
            .catch(this.handleAssetError);
    }

    /**
     * Prefetches assets for text.
     *
     * @param {boolean} [options.assets] - Whether or not to prefetch static assets
     * @param {boolean} [options.content] - Whether or not to prefetch rep content
     * @return {void}
     */
    prefetch({ assets = true, content = true }) {
        if (assets) {
            this.prefetchAssets(this.getJS(), this.getCSS());
        }

        const { representation } = this.options;
        if (content && this.isRepresentationReady(representation)) {
            const template = representation.content.url_template;
            this.api.get(this.createContentUrlWithAuthParams(template), { type: 'document' });
        }
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
     * @inheritdoc
     */
    setup() {
        if (this.isSetup) {
            return;
        }

        // Call super() first to set up common layout
        super.setup();

        this.textEl = this.createViewer(document.createElement('pre'));
        this.textEl.className = `bp-text bp-text-plain hljs ${CLASS_IS_SCROLLABLE} ${CLASS_HIDDEN}`;
        this.textEl.tabIndex = '0';

        this.codeEl = this.textEl.appendChild(document.createElement('code'));
        this.codeEl.className = `bp-text-code ${this.options.file.extension}`;

        // Whether or not we truncated text shown due to performance issues
        this.truncated = false;

        this.initPrint();
    }

    /**
     * Returns JS assets
     *
     * @override
     * @return {string[]} text js assets
     */
    getJS() {
        return JS;
    }

    /**
     * Returns CSS assets
     *
     * @override
     * @return {string[]} text css assets
     */
    getCSS() {
        return CSS;
    }

    /**
     * Finishes loading after text is highlighted.
     *
     * @protected
     * @param {string} content - Text
     * @param {boolean} isHighlighted - Whether or not text is highlighted
     * @return {void}
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
        this.emit(VIEWER_EVENT.load);

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
     * Loads a text file.
     *
     * @private
     * @return {Promise} promise to get text content
     */
    postLoad = () => {
        const { representation, file } = this.options;
        const template = representation.content.url_template;
        const { extension, size } = file;

        this.truncated = size > SIZE_LIMIT_BYTES;
        const headers = this.truncated ? { Range: `bytes=0-${SIZE_LIMIT_BYTES}` } : {};

        const contentUrl = this.createContentUrlWithAuthParams(template);
        this.startLoadTimer();
        return this.api
            .get(contentUrl, { headers, type: 'text' })
            .catch(error => {
                this.handleDownloadError(error, contentUrl);
            })
            .then(text => {
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
            })
            .catch(this.handleAssetError);
    };

    /**
     * Loads highlight.js to highlight the file
     *
     * @private
     * @param {string} text - The text content to load
     * @return {void}
     */
    initHighlightJs(text) {
        const workerBlob = new Blob([HIGHLIGHT_WORKER_JS], {
            type: 'application/javascript',
        });
        this.workerSrc = URL.createObjectURL(workerBlob);
        const worker = new Worker(this.workerSrc);

        // Once highlighting is done, replace content and finish loading
        worker.onmessage = event => {
            this.finishLoading(event.data, true);
        };

        // Give worker location of highlight.js and text content to highlight
        const assetUrlCreator = createAssetUrlCreator(this.options.location);
        const highlightSrc = assetUrlCreator(`third-party/text/${TEXT_STATIC_ASSETS_VERSION}/highlight.min.js`);
        worker.postMessage({
            highlightSrc,
            text,
        });
    }

    /**
     * Sets up the print dialog.
     *
     * @private
     * @return {void}
     */
    initPrint() {
        this.printPopup = new Popup(this.rootEl);

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
     * @private
     * @param {string[]} stylesheets - Stylesheets needed for print
     * @return {void}
     */
    preparePrint(stylesheets) {
        const assetUrlCreator = createAssetUrlCreator(this.options.location);
        this.printframe = openContentInsideIframe(this.textEl.outerHTML);
        stylesheets.forEach(stylesheet => {
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
     * @private
     * @return {void}
     */
    printIframe() {
        this.printframe.contentWindow.focus();
        if (Browser.getName() === BROWSERS.INTERNET_EXPLORER || Browser.getName() === BROWSERS.EDGE) {
            this.printframe.contentWindow.document.execCommand('print', false, null);
        } else {
            this.printframe.contentWindow.print();
        }
    }

    /**
     * Shows notification that text was truncated along with download button.
     *
     * @private
     * @return {void}
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
     * @private
     * @return {void}
     */
    download() {
        this.emit(VIEWER_EVENT.download);
    }
}

export default PlainTextViewer;
