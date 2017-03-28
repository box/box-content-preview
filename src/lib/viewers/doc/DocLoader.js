import AssetLoader from '../AssetLoader';
import { getRepresentation } from '../../file';
import DocumentViewer from './DocumentViewer';
import PresentationViewer from './PresentationViewer';
import RepStatus from '../../RepStatus';
import { ORIGINAL_REP_NAME, STATUS_SUCCESS } from '../../constants';

// Order of the viewers matters. Prefer original before others. Go from specific to general.
// For example, a pdf file can be previewed both natively (majority use case) using the original
// representation but can fallback to using the pdf representation (for watermarked versions).
const VIEWERS = [
    {
        NAME: 'Presentation',
        CONSTRUCTOR: PresentationViewer,
        REP: 'pdf',
        EXT: ['odp', 'ppt', 'pptx']
    },
    {
        NAME: 'Document',
        CONSTRUCTOR: DocumentViewer,
        REP: 'pdf',
        EXT: ['as', 'as3', 'asm', 'bat', 'c', 'cc', 'cmake', 'cpp', 'cs', 'css', 'csv', 'cxx', 'diff', 'doc', 'docx', 'erb', 'gdoc', 'groovy', 'gsheet', 'h', 'haml', 'hh', 'htm', 'html', 'java', 'js', 'less', 'log', 'm', 'make', 'md', 'ml', 'mm', 'msg', 'odp', 'ods', 'odt', 'pdf', 'php', 'pl', 'plist', 'ppt', 'pptx', 'properties', 'py', 'rb', 'rst', 'rtf', 'sass', 'scala', 'scm', 'script', 'sh', 'sml', 'sql', 'tsv', 'txt', 'vi', 'vim', 'webdoc', 'wpd', 'xhtml', 'xls', 'xlsm', 'xlsx', 'xml', 'xsd', 'xsl', 'yaml']
    },
    {
        NAME: 'Document',
        CONSTRUCTOR: DocumentViewer,
        REP: ORIGINAL_REP_NAME,
        EXT: ['pdf', 'lcdpdf']
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

        // For PDF files, use original rep unless PDF rep is successful since it'll be faster
        const rep = super.determineRepresentation(file, viewer);
        const status = RepStatus.getStatus(rep);
        if (file.extension === 'pdf' && rep.representation === 'pdf' && status !== STATUS_SUCCESS) {
            repOverride = getRepresentation(file, ORIGINAL_REP_NAME);
        }

        return repOverride || rep;
    }
}

export default new DocLoader();
