import AssetLoader from '../asset-loader';
import DocPreloader from './doc-preloader';
import { addPreloadRepresentation, getRepresentation } from '../../file';
import { createContentUrl, appendAuthParams } from '../../util';
import Doc from './document';
import Presentation from './presentation';
import { ORIGINAL_REP_NAME } from '../../constants';

// Order of the viewers matters. Prefer original before others. Go from specific to general.
// For example, a pdf file can be previewed both natively (majority use case) using the original
// representation but can fallback to using the pdf representation (for watermarked versions).
const VIEWERS = [
    {
        REP: 'pdf',
        EXT: ['odp', 'ppt', 'pptx'],
        NAME: Presentation
    },
    {
        REP: 'pdf',
        EXT: ['as', 'as3', 'asm', 'bat', 'c', 'cc', 'cmake', 'cpp', 'cs', 'css', 'csv', 'cxx', 'diff', 'doc', 'docx', 'erb', 'gdoc', 'groovy', 'gsheet', 'h', 'haml', 'hh', 'htm', 'html', 'java', 'js', 'less', 'log', 'm', 'make', 'md', 'ml', 'mm', 'msg', 'odp', 'ods', 'odt', 'pdf', 'php', 'pl', 'plist', 'ppt', 'pptx', 'properties', 'py', 'rb', 'rst', 'rtf', 'sass', 'scala', 'scm', 'script', 'sh', 'sml', 'sql', 'tsv', 'txt', 'vi', 'vim', 'webdoc', 'wpd', 'xhtml', 'xls', 'xlsm', 'xlsx', 'xml', 'xsd', 'xsl', 'yaml'],
        NAME: Doc
    },
    {
        REP: ORIGINAL_REP_NAME,
        EXT: ['pdf'],
        NAME: Doc
    }
];

class DocLoader extends AssetLoader {

    /**
     * [constructor]
     *
     * @return {DocLoader} DocLoader instance
     */
    constructor() {
        super();
        this.viewers = VIEWERS;
    }

    /**
     * Chooses a representation. Assumes that there will be only
     * one specific representation. In other words we will not have
     * two png representation entries with different properties.
     *
     * @param {Object} file - Box file
     * @param {Object} viewer - Chosen Preview viewer
     * @return {Object} The representation to load
     */
    determineRepresentation(file, viewer) {
        let repOverride;

        // For PDF files, use PDF representation unless it's pending - if it is, use original rep
        const rep = super.determineRepresentation(file, viewer);
        const status = (typeof rep.status === 'object') ? rep.status.state : rep.temp_status.state;
        if (file.extension === 'pdf' && rep.representation === 'pdf' && status === 'pending') {
            repOverride = file.representations.entries.find((entry) => entry.representation === ORIGINAL_REP_NAME);
        }

        return repOverride || rep;
    }

    /**
     * Shows a preload (lightweight representation) of the document.
     *
     * @param {Object} file - Box file
     * @param {string} token - Access token
     * @param {string} sharedLink - Box shared link
     * @param {string} sharedLinkPassword - Box shared link password
     * @param {HTMLElement} containerEl - Preview container to render preload in
     * @return {void}
     */
    /* istanbul ignore next */
    showPreload(file, token, sharedLink, sharedLinkPassword, containerEl) {
        // Only enable preloading for regular documents, not presentations
        const viewer = this.determineViewer(file);
        if (!viewer.PRELOAD) {
            return;
        }

        // @NOTE(tjin): Temporary until conversion provides real preload representation
        addPreloadRepresentation(file);
        // DELETE LINE ABOVE

        const preloadRep = getRepresentation(file, viewer.PRELOAD);
        if (!preloadRep || preloadRep.status.state !== 'success') {
            return;
        }

        // @NOTE(tjin): Temporary - real preload representation shouldn't have an asset name
        const preloadUrl = createContentUrl(preloadRep.content.url_template, 'page-1.png');
        if (!preloadUrl) {
            return;
        }

        const preloadUrlWithAuth = appendAuthParams(preloadUrl, token, sharedLink, sharedLinkPassword);
        DocPreloader.showPreload(preloadUrlWithAuth, containerEl);
    }

    /**
     * Hides the preload if it exists.
     *
     * @param {HTMLElement} containerEl - Preview container that preload is rendered in
     * @return {void}
     */
    /* istanbul ignore next */
    hidePreload(containerEl) {
        DocPreloader.hidePreload(containerEl);
    }
}

export default new DocLoader();
