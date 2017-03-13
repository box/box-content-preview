import autobind from 'autobind-decorator';
import Base from '../Base';
import Browser from '../../Browser';
import Popup from '../../Popup';
import { CLASS_HIDDEN } from '../../constants';
import { getRepresentation } from '../../file';
import { ICON_PRINT_CHECKMARK } from '../../icons/icons';
import { get } from '../../util';

const LOAD_TIMEOUT_MS = 120000;
const SAFARI_PRINT_TIMEOUT_MS = 1000; // Wait 1s before trying to print
const PRINT_DIALOG_TIMEOUT_MS = 500;

@autobind
class Office extends Base {

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * @inheritdoc
     */
    setup() {
        // Call super() first to set up common layout
        super.setup();
        this.setupIframe();
        this.initPrint();
        this.setupPDFUrl();

        // Timeout for loading the preview
        this.loadTimeout = LOAD_TIMEOUT_MS;
    }

    /**
     * [destructor]
     *
     * @return {void}
     */
    destroy() {
        // Clean up print blob
        this.printBlob = null;
        if (this.printPopup) {
            this.printPopup.destroy();
        }
        super.destroy();
    }

    /**
     * Loads a xlsx file.
     *
     * @return {void}
     */
    load() {
        this.setup();
        super.load();
        this.loaded = true;
        this.emit('load');
    }

    /**
     * Prints text using an an iframe.
     *
     * @return {void}
     */
    print() {
        // If print blob is not ready, fetch it
        if (!this.printBlob) {
            this.fetchPrintBlob(this.pdfUrl).then(this.print);

            // Show print dialog after PRINT_DIALOG_TIMEOUT_MS
            this.printDialogTimeout = setTimeout(() => {
                this.printPopup.show(__('print_loading'), __('print'), () => {
                    this.printPopup.hide();
                    this.browserPrint();
                });

                this.printPopup.disableButton();
                this.printDialogTimeout = null;
            }, PRINT_DIALOG_TIMEOUT_MS);
            return;
        }

        // Immediately print if either printing is ready within PRINT_DIALOG_TIMEOUT_MS
        // or if popup is not visible (e.g. from initiating print again)
        if (this.printDialogTimeout || !this.printPopup.isVisible()) {
            clearTimeout(this.printDialogTimeout);
            this.browserPrint();
        } else {
            // Update popup UI to reflect that print is ready
            this.printPopup.enableButton();
            this.printPopup.messageEl.textContent = __('print_ready');
            this.printPopup.loadingIndicator.classList.add(CLASS_HIDDEN);
            this.printPopup.printCheckmark.classList.remove(CLASS_HIDDEN);
        }
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Sets up the print dialog.
     *
     * @private
     * @return {void}
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
     * Sets up the PDF url that is used for printing.
     *
     * @private
     * @return {void}
     */
    setupPDFUrl() {
        const { file } = this.options;
        const pdfRep = getRepresentation(file, 'pdf');
        const { url_template: template } = pdfRep.content;
        this.pdfUrl = this.createContentUrlWithAuthParams(template);
    }

    /**
     * Sets up the iframe that points to the Office Online integration.
     *
     * @private
     * @return {void}
     */
    setupIframe() {
        this.iframeEl = this.containerEl.appendChild(document.createElement('iframe'));
        this.iframeEl.setAttribute('width', '100%');
        this.iframeEl.setAttribute('height', '100%');
        this.iframeEl.setAttribute('frameborder', 0);
        this.iframeEl.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups');

        const { appHost, file, sharedLink } = this.options;
        let src = `${appHost}/integrations/officeonline/openExcelOnlinePreviewer`;
        if (sharedLink) {
            // Find the shared or vanity name
            const sharedName = sharedLink.split('/s/')[1];
            if (sharedName) {
                src += `?s=${sharedName}&fileId=${file.id}`;
            } else {
                const tempAnchor = document.createElement('a');
                tempAnchor.href = sharedLink;
                const vanitySubdomain = tempAnchor.hostname.split('.')[0];
                const vanityName = tempAnchor.pathname.split('/v/')[1];
                src += `?v=${vanityName}&vanity_subdomain=${vanitySubdomain}&fileId=${file.id}`;
            }
        } else {
            src += `?fileId=${file.id}`;
        }

        this.iframeEl.src = src;
    }

    /**
     * Fetches PDF and converts to blob for printing.
     *
     * @private
     * @param {string} pdfUrl - PDF URL
     * @return {Promise} Promise setting print blob
     */
    fetchPrintBlob(pdfUrl) {
        return get(pdfUrl, 'blob').then((blob) => {
            this.printBlob = blob;
        });
    }

    /**
     * Handles logic for printing the PDF representation in browser.
     *
     * @private
     * @return {void}
     */
    browserPrint() {
        // For IE & Edge, use the open or save dialog since we can't open
        // in a new tab due to security restrictions, see:
        // http://stackoverflow.com/questions/24007073/open-links-made-by-createobjecturl-in-ie11
        if (typeof window.navigator.msSaveOrOpenBlob === 'function') {
            const printResult = window.navigator.msSaveOrOpenBlob(this.printBlob, 'print.pdf');

            // If open/save notification is not shown, broadcast error
            if (!printResult) {
                this.emit('printerror');
            } else {
                this.emit('printsuccess');
            }

        // For other browsers, open and print in a new tab
        } else {
            const printURL = URL.createObjectURL(this.printBlob);
            const printResult = window.open(printURL);

            // Open print popup if possible
            if (printResult && typeof printResult.print === 'function') {
                const browser = Browser.getName();

                // Chrome supports printing on load
                if (browser === 'Chrome') {
                    printResult.addEventListener('load', () => {
                        printResult.print();
                    });

                // Safari print on load produces blank page, so we use a timeout
                } else if (browser === 'Safari') {
                    setTimeout(() => {
                        printResult.print();
                    }, SAFARI_PRINT_TIMEOUT_MS);
                }

                // Firefox has a blocking bug: https://bugzilla.mozilla.org/show_bug.cgi?id=911444
            }

            // If new window/tab was blocked, broadcast error
            if (!printResult || printResult.closed || typeof printResult.closed === 'undefined') {
                this.emit('printerror');
            } else {
                this.emit('printsuccess');
            }

            URL.revokeObjectURL(printURL);
        }
    }
}

export default Office;
