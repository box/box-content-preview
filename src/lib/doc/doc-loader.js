import AssetLoader from '../asset-loader';

const STATIC_URI = 'third-party/doc/';
const SCRIPTS_DOCUMENT = [`${STATIC_URI}compatibility.js`, `${STATIC_URI}pdf.js`, `${STATIC_URI}pdf_viewer.js`, `${STATIC_URI}pdf_find_controller.js`, 'document.js'];

// Order of the viewers matters. Prefer original before others. Go from specific to general.
// For example, a pdf file can be previewed both natively (majority use case) using the original
// representation but can fallback to using the pdf representation (for watermarked versions).
const VIEWERS = [
    {
        REPRESENTATION: 'original',
        EXTENSIONS: ['pdf'],
        SCRIPTS: SCRIPTS_DOCUMENT,
        STYLESHEETS: [`${STATIC_URI}pdf_viewer.css`, 'document.css'],
        CONSTRUCTOR: 'Document',
        PREFETCH: 'xhr'
    },
    {
        REPRESENTATION: 'pdf',
        EXTENSIONS: ['ppt', 'pptx'],
        SCRIPTS: [`${STATIC_URI}compatibility.js`, `${STATIC_URI}pdf.js`, `${STATIC_URI}pdf_viewer.js`, `${STATIC_URI}pdf_find_controller.js`, 'presentation.js'],
        STYLESHEETS: [`${STATIC_URI}pdf_viewer.css`, '`${STATIC_URI}presentation.css'],
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
}

export default new DocLoader();
