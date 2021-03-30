import BaseViewer from '../BaseViewer';
import Browser from '../../Browser';
import Location from '../../Location';
import Popup from '../../Popup';
import { CLASS_HIDDEN } from '../../constants';
import { getRepresentation } from '../../file';
import { ICON_PRINT_CHECKMARK } from '../../icons';
import { VIEWER_EVENT } from '../../events';
import { getProp } from '../../util';

const LOAD_TIMEOUT_MS = 120000;
const SAFARI_PRINT_TIMEOUT_MS = 1000; // Wait 1s before trying to print
const PRINT_DIALOG_TIMEOUT_MS = 500;

const EXCEL_ONLINE_EMBED_URL = 'https://excel.officeapps.live.com/x/_layouts/xlembed.aspx';
const OFFICE_ONLINE_IFRAME_NAME = 'office-online-iframe';
const MESSAGE_HOST_READY = 'Host_PostmessageReady';

class OfficeViewer extends BaseViewer {
    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * @inheritdoc
     */
    constructor(options) {
        super(options);

        // Bind context for handlers
        this.print = this.print.bind(this);
    }

    /**
     * @inheritdoc
     */
    setup() {
        if (this.isSetup) {
            return;
        }

        // Call super() to set up common layout
        super.setup();

        this.platformSetup = false;
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

        if (this.printURL) {
            URL.revokeObjectURL(this.printURL);
        }

        super.destroy();
    }

    /**
     * Loads a xlsx file.
     *
     * @return {void}
     */
    load() {
        super.load();
        // Negligible load timer
        this.startLoadTimer();
        this.loaded = true;
        this.emit(VIEWER_EVENT.load);
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
     * Sets up the PDF url that is used for printing.
     *
     * @private
     * @return {void}
     */
    setupPDFUrl() {
        const { file } = this.options;
        const pdfRep = getRepresentation(file, 'pdf');
        const template = getProp(pdfRep, 'content.url_template');

        // This occurs in the case of .xlsb files where no pdf rep exists
        if (template) {
            this.pdfUrl = this.createContentUrlWithAuthParams(template);
        }
    }

    /**
     * Sets up the iframe that points to the Office Online integration.
     *
     * @private
     * @return {void}
     */
    setupIframe() {
        const {
            appHost,
            apiHost,
            file,
            sharedLink,
            location: { locale },
        } = this.options;
        const iframeEl = this.createIframeElement();
        this.createViewer(iframeEl);

        if (this.platformSetup) {
            const formEl = this.createFormElement(apiHost, file.id, sharedLink, locale);
            // Submitting the form securely passes a Preview access token to
            // Microsoft so they can hit our WOPI endpoints.
            formEl.submit();

            // Tell Office Online that we are ready to receive messages
            iframeEl.contentWindow.postMessage(MESSAGE_HOST_READY, Location.getOrigin());
        } else {
            iframeEl.src = this.setupRunmodeURL(appHost, file.id, sharedLink);
        }
    }

    /**
     * Sets up the runmode URL that fills a wrapper iframe around the Office Online iframe.
     *
     * @private
     * @param {string} appHost - Application host
     * @param {string} fileId - File ID
     * @param {string} sharedLink - Shared link which may be a vanity URL
     * @return {string} Runmode URL
     */
    setupRunmodeURL(appHost, fileId, sharedLink) {
        let route = '/integrations/officeonline/openExcelOnlinePreviewer';

        const domain = document.createElement('a');
        domain.href = sharedLink;

        if (sharedLink) {
            // Use the domain in case previewer has a different subdomain
            // IE 11 does not support link.origin, so we combine the protocol and the hostname
            const sharedLinkOrigin = `${domain.protocol}//${domain.hostname}`;
            route = `${sharedLinkOrigin}${route}`;
            // Find the shared or vanity name
            const sharedName = sharedLink.split('/s/')[1];
            if (sharedName) {
                route = `${route}?s=${sharedName}&fileId=${fileId}`;
            } else {
                const vanitySubdomain = domain.hostname.split('.')[0];
                const vanityName = domain.href.split('/v/')[1];
                route = `${route}?v=${vanityName}&vanity_subdomain=${vanitySubdomain}&fileId=${fileId}`;
            }
        } else {
            route = `${appHost}${route}?fileId=${fileId}`;
        }

        return route;
    }

    /**
     * Sets up the WOPI src that is used in the Office Online action URL.
     *
     * @private
     * @param {string} apiHost - API Host
     * @param {string} fileId - File ID
     * @param {string} sharedLink - Shared link which may be a vanity URL
     * @return {string} WOPI src URL
     */
    setupWOPISrc(apiHost, fileId, sharedLink) {
        let wopiSrc = `${apiHost}/wopi/files/`;

        if (sharedLink) {
            const sharedName = sharedLink.split('/s/')[1];
            if (sharedName) {
                wopiSrc = `${wopiSrc}s_${sharedName}_f_`;
            }
        }

        return `${wopiSrc}${fileId}`;
    }

    /**
     * Creates the iframe element used for both the platform and webapp setup.
     *
     * @private
     * @return {HTMLElement} Iframe element
     */
    createIframeElement() {
        const iframeEl = document.createElement('iframe');
        iframeEl.setAttribute('width', '100%');
        iframeEl.setAttribute('height', '100%');
        iframeEl.setAttribute('frameborder', 0);
        iframeEl.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-downloads');

        if (this.platformSetup) {
            iframeEl.setAttribute('allowfullscreen', 'true');
            iframeEl.name = OFFICE_ONLINE_IFRAME_NAME;
            iframeEl.id = OFFICE_ONLINE_IFRAME_NAME;
        }

        return iframeEl;
    }

    /**
     * Sets up the form that will be posted to the Office Online viewer. The form
     * includes an access token, the token's time to live, and an action URL that
     * Micrsoft uses to hit our WOPI endpoint.
     *
     * @private
     * @param {string} apiHost - API host
     * @param {string} fileId - File ID
     * @param {string} sharedLink - Shared link which may be a vanity URL
     * @param {string} locale - Locale
     * @return {HTMLElement} Form element
     */
    createFormElement(apiHost, fileId, sharedLink, locale) {
        // Setting the action URL
        const WOPISrc = this.setupWOPISrc(apiHost, fileId, sharedLink);
        const origin = { origin: Location.getOrigin() };
        const formEl = this.containerEl.appendChild(document.createElement('form'));
        // We pass our origin in the sessionContext so that Microsoft will pass
        // this to the checkFileInfo endpoint. From their we can set it as the
        // origin for iframe postMessage communications.
        formEl.setAttribute(
            'action',
            `${EXCEL_ONLINE_EMBED_URL}?ui=${locale}&rs=${locale}&WOPISrc=${WOPISrc}&sc=${JSON.stringify(origin)}`,
        );
        formEl.setAttribute('method', 'POST');
        formEl.setAttribute('target', OFFICE_ONLINE_IFRAME_NAME);

        // Setting the token
        const tokenInput = document.createElement('input');
        tokenInput.setAttribute('name', 'access_token');
        tokenInput.setAttribute('value', `${this.options.token}`);
        tokenInput.setAttribute('type', 'hidden');

        // Calculating and setting the time to live
        const ttlInput = document.createElement('input');
        ttlInput.setAttribute('name', 'access_token_TTL');
        // Setting to 0 disables refresh messages from Microsoft
        ttlInput.setAttribute('value', 0);
        ttlInput.setAttribute('type', 'hidden');

        formEl.appendChild(tokenInput);
        formEl.appendChild(ttlInput);
        return formEl;
    }

    /**
     * Fetches PDF and converts to blob for printing.
     *
     * @private
     * @param {string} pdfUrl - PDF URL
     * @return {Promise} Promise setting print blob
     */
    fetchPrintBlob(pdfUrl) {
        return this.api.get(pdfUrl, { type: 'blob' }).then(blob => {
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
            if (!this.printURL) {
                this.printURL = URL.createObjectURL(this.printBlob);
            }

            const printResult = window.open(this.printURL);

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
        }
    }
}

export default OfficeViewer;
