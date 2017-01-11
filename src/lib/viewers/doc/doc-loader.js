import AssetLoader from '../asset-loader';

const STATIC_URI = 'third-party/doc/';
const SCRIPTS_DOCUMENT = [`${STATIC_URI}compatibility.min.js`, `${STATIC_URI}pdf.min.js`, `${STATIC_URI}pdf_viewer.min.js`, `${STATIC_URI}pdf.worker.min.js`, 'document.js'];

// Order of the viewers matters. Prefer original before others. Go from specific to general.
// For example, a pdf file can be previewed both natively (majority use case) using the original
// representation but can fallback to using the pdf representation (for watermarked versions).
const VIEWERS = [
    {
        REPRESENTATION: 'pdf',
        EXTENSIONS: ['odp', 'ppt', 'pptx'],
        SCRIPTS: [`${STATIC_URI}compatibility.min.js`, `${STATIC_URI}pdf.min.js`, `${STATIC_URI}pdf_viewer.min.js`, `${STATIC_URI}pdf.worker.min.js`, 'presentation.js'],
        STYLESHEETS: [`${STATIC_URI}pdf_viewer.css`, 'presentation.css'],
        CONSTRUCTOR: 'Presentation',
        PREFETCH: 'xhr'
    },
    {
        REPRESENTATION: 'pdf',
        EXTENSIONS: ['as', 'as3', 'asm', 'bat', 'c', 'cc', 'cmake', 'cpp', 'cs', 'css', 'csv', 'cxx', 'diff', 'doc', 'docx', 'erb', 'gdoc', 'groovy', 'gsheet', 'h', 'haml', 'hh', 'htm', 'html', 'java', 'js', 'less', 'log', 'm', 'make', 'md', 'ml', 'mm', 'msg', 'odp', 'ods', 'odt', 'pdf', 'php', 'pl', 'plist', 'ppt', 'pptx', 'properties', 'py', 'rb', 'rst', 'rtf', 'sass', 'scala', 'scm', 'script', 'sh', 'sml', 'sql', 'tsv', 'txt', 'vi', 'vim', 'webdoc', 'wpd', 'xhtml', 'xls', 'xlsm', 'xlsx', 'xml', 'xsd', 'xsl', 'yaml'],
        SCRIPTS: SCRIPTS_DOCUMENT,
        STYLESHEETS: [`${STATIC_URI}pdf_viewer.css`, 'document.css'],
        CONSTRUCTOR: 'Document',
        PREFETCH: 'xhr'
    },
    {
        REPRESENTATION: 'original',
        EXTENSIONS: ['pdf'],
        SCRIPTS: SCRIPTS_DOCUMENT,
        STYLESHEETS: [`${STATIC_URI}pdf_viewer.css`, 'document.css'],
        CONSTRUCTOR: 'Document',
        PREFETCH: 'xhr'
    }
];

class DocLoader extends AssetLoader {

    /**
     * [constructor]
     * @returns {DocLoader} DocLoader instance
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
     * @param {Object} file box file
     * @param {Object} viewer the chosen viewer
     * @returns {Object} The representation to load
     */
    determineRepresentation(file, viewer) {
        let repOverride;

        // For PDF files, use PDF representation unless it's pending - if it is, use original rep
        const rep = super.determineRepresentation(file, viewer);
        if (file.extension === 'pdf' && rep.representation === 'pdf' && rep.status === 'pending') {
            repOverride = file.representations.entries.find((entry) => entry.representation === 'original');
        }

        return repOverride || rep;
    }
}

export default new DocLoader();
