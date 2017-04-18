import autobind from 'autobind-decorator';
import BaseViewer from '../BaseViewer';
import { get } from '../../util';
import { getRepresentation } from '../../file';
import * as printUtil from '../../print-util';

const LOAD_TIMEOUT_MS = 120000;
const PRINT_DIALOG_TIMEOUT_MS = 500; // Wait before showing popup

@autobind
class OfficeViewer extends BaseViewer {

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
        this.printPopup = printUtil.initPrintPopup(this.containerEl);
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
        this.printPopup.destroy();
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
     * Sets up and triggers print of the PDF representation.
     *
     * @return {void}
     */
    print() {
        if (!this.printBlob) {
            get(this.pdfUrl, 'blob')
                .then((blob) => {
                    this.printBlob = blob;
                }).then(this.finishPrint);

            this.printDialogTimeout = setTimeout(() => {
                clearTimeout(this.printDialogTimeout);
                this.printDialogTimeout = null;
                printUtil.showPrintPopup(this.printPopup, this.finishPrint);
            }, PRINT_DIALOG_TIMEOUT_MS);
        } else {
            this.finishPrint();
        }
    }

    /**
     * Executes the print and emits the result.
     *
     * @return {void}
     */
    finishPrint = () => {
        const printNotification = printUtil.printPDF(this.printBlob, this.printDialogTimeout, this.printPopup);
        if (printNotification !== '') {
            this.emit(printNotification);
        }
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
}

export default OfficeViewer;
