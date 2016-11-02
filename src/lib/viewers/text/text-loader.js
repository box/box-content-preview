import AssetLoader from '../asset-loader';

const MAX_FILE_SIZE_FOR_TEXT_VIEWER_BYTES = 250000;
const STATIC_URI = 'third-party/text/';

// Order of the viewers matters. Prefer original before others. Go from specific to general.
const VIEWERS = [
    // {
    //     REPRESENTATION: 'extracted_text',
    //     EXTENSIONS: ['md'],
    //     SCRIPTS: [`${STATIC_URI}highlight.min.js`, 'markdown.js'],
    //     STYLESHEETS: [`${STATIC_URI}github.css`, 'markdown.css'],
    //     CONSTRUCTOR: 'MarkDown',
    //     PREFETCH: 'xhr'
    // },
    {
        REPRESENTATION: 'original',
        EXTENSIONS: ['htm', 'html', 'xhtml', 'xml', 'xsd', 'xsl'], // These types do not have an appropriate extracted text representation for preview
        SCRIPTS: [`${STATIC_URI}highlight.min.js`, 'text.js'],
        STYLESHEETS: [`${STATIC_URI}github.css`, 'text.css'],
        CONSTRUCTOR: 'Text',
        PREFETCH: 'xhr'
    },
    {
        // @TODO(tjin): change this to 'text' rep once that representation is out
        REPRESENTATION: 'original',
        EXTENSIONS: ['csv', 'tsv'],
        SCRIPTS: [`${STATIC_URI}papaparse.min.js`, 'csv.js'],
        STYLESHEETS: ['csv.css'],
        CONSTRUCTOR: 'CSV',
        PREFETCH: 'xhr'
    },
    {
        // @TODO(tjin): change this to 'text' rep once that representation is out
        REPRESENTATION: 'original',
        EXTENSIONS: ['as', 'as3', 'asm', 'bat', 'c', 'cc', 'cmake', 'cpp', 'cs', 'css', 'cxx', 'diff', 'erb', 'groovy', 'h', 'haml', 'hh', 'java', 'js', 'less', 'log', 'm', 'make', 'md', 'ml', 'mm', 'php', 'pl', 'plist', 'properties', 'py', 'rb', 'rst', 'sass', 'scala', 'script', 'scm', 'sml', 'sql', 'sh', 'tsv', 'txt', 'vi', 'vim', 'webdoc', 'yaml'],
        SCRIPTS: [`${STATIC_URI}highlight.min.js`, 'text.js'],
        STYLESHEETS: [`${STATIC_URI}github.css`, 'text.css'],
        CONSTRUCTOR: 'Text',
        PREFETCH: 'xhr'
    }
];

class TextLoader extends AssetLoader {

    /**
     * [constructor]
     *
     * @returns {TextLoader} TextLoader instance
     */
    constructor() {
        super();
        this.viewers = VIEWERS;
    }

    /**
     * @inheritdoc
     */
    determineViewer(file, disabledViewers = []) {
        const viewer = super.determineViewer(file, disabledViewers);

        // Don't use text viewer if file size is greater than 250KB otherwise the browser can hang
        if (viewer && viewer.CONSTRUCTOR === 'Text' && file.size > MAX_FILE_SIZE_FOR_TEXT_VIEWER_BYTES) {
            return null;
        }

        return viewer;
    }
}

export default new TextLoader();
