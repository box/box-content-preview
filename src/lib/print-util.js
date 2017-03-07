import Browser from './Browser';
import { CLASS_HIDDEN } from './constants';
import Popup from './Popup';
import { ICON_PRINT_CHECKMARK } from './icons/icons';

const SAFARI_PRINT_TIMEOUT_MS = 1000; // Wait 1s before trying to print

/**
 * Sets up print popup.
 *
 * @param {HTMLElement} containerEl - Container to be initialized
 * @return {Popup} Print popup
 */
export function initPrintPopup(containerEl) {
    const printPopup = new Popup(containerEl);
    const printCheckmark = document.createElement('div');
    printCheckmark.className = `bp-print-check ${CLASS_HIDDEN}`;
    printCheckmark.innerHTML = ICON_PRINT_CHECKMARK.trim();

    const loadingIndicator = document.createElement('div');
    loadingIndicator.classList.add('bp-crawler');
    loadingIndicator.innerHTML = `
        <div></div>
        <div></div>
        <div></div>`.trim();

    printPopup.addContent(loadingIndicator, true);
    printPopup.addContent(printCheckmark, true);

    // Save a reference so they can be hidden or shown later.
    printPopup.loadingIndicator = loadingIndicator;
    printPopup.printCheckmark = printCheckmark;

    return printPopup;
}


/**
 * Shows the print popup.
 *
 * @param {Popup} printPopup - The popup to be shown
 * @param {Function} printCallback - Callback function fire when button is clicked
 * @return {void}
 */
export function showPrintPopup(printPopup, printCallback) {
    printPopup.show(__('print_loading'), __('print'), () => {
        printPopup.hide();
        printCallback();
    });

    printPopup.disableButton();
}

/**
 * Enables the print popup.
 *
 * @param {Popup} printPopup - The print popup
 * @return {void}
 */
export function enablePrintPopup(printPopup) {
    printPopup.enableButton();
    /* eslint-disable no-param-reassign */
    printPopup.messageEl.textContent = __('print_ready');
    /* eslint-enable no-param-reassign */
    printPopup.loadingIndicator.classList.add(CLASS_HIDDEN);
    printPopup.printCheckmark.classList.remove(CLASS_HIDDEN);
}

/**
 * Handles logic for printing the PDF representation in browser.
 *
 * @param {Object} printBlob - Blob of PDF representation
 * @return {string} Print message to be emitted.
 */
export function browserPrint(printBlob) {
    // For IE & Edge, use the open or save dialog since we can't open
    // in a new tab due to security restrictions, see:
    // http://stackoverflow.com/questions/24007073/open-links-made-by-createobjecturl-in-ie11
    let printMessage;
    if (typeof window.navigator.msSaveOrOpenBlob === 'function') {
        const printResult = window.navigator.msSaveOrOpenBlob(printBlob, 'print.pdf');

        // If open/save notification is not shown, broadcast error
        if (!printResult) {
            printMessage = 'printerror';
        } else {
            printMessage = 'printsuccess';
        }

    // For other browsers, open and print in a new tab
    } else {
        const printURL = URL.createObjectURL(printBlob);
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
            printMessage = 'printerror';
        } else {
            printMessage = 'printsuccess';
        }

        URL.revokeObjectURL(printURL);
    }

    return printMessage;
}

/**
 *  Prints the PDF representation via the browser.
 *
 * @param {Object} printBlob - Blob of PDF representation
 * @param {number} printDialogTimeout - Timeout to show print dialog
 * @param {Popup} printPopup - The print popup
 * @return {string}
 */
export function printPDF(printBlob, printDialogTimeout, printPopup) {
    let printNotificationMessage = '';
    if (printDialogTimeout || !printPopup.isVisible()) {
        clearTimeout(printDialogTimeout);
        printNotificationMessage = browserPrint(printBlob);
    } else {
        enablePrintPopup(printPopup);
    }

    return printNotificationMessage;
}
