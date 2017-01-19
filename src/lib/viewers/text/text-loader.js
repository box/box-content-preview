import AssetLoader from '../asset-loader';

const STATIC_URI = 'third-party/text/';

// Order of the viewers matters. Prefer original before others. Go from specific to general.
const VIEWERS = [
    {
        REP: 'text',
        EXT: ['csv', 'tsv'],
        JS: [`${STATIC_URI}papaparse.min.js`, 'csv.js'],
        CSS: ['csv.css'],
        NAME: 'CSV',
        PREFETCH: 'xhr',
        ASSET: ''
    },
    {
        REP: 'text',
        EXT: ['md'],
        JS: [`${STATIC_URI}highlight.min.js`, 'markdown.js'],
        CSS: [`${STATIC_URI}github-markdown.css`, `${STATIC_URI}github.css`, 'markdown.css'],
        NAME: 'Markdown',
        PREFETCH: 'xhr',
        ASSET: ''
    },
    {
        REP: 'ORIGINAL',
        EXT: ['htm', 'html', 'xhtml', 'xml', 'xsd', 'xsl'], // These types do not have an appropriate extracted text representation for preview
        JS: [`${STATIC_URI}highlight.min.js`, 'text.js'],
        CSS: [`${STATIC_URI}github.css`, 'text.css'],
        NAME: 'Text',
        PREFETCH: 'xhr',
        ASSET: ''
    },
    {
        REP: 'text',
        EXT: ['as', 'as3', 'asm', 'bat', 'c', 'cc', 'cmake', 'cpp', 'cs', 'css', 'cxx', 'diff', 'erb', 'groovy', 'h', 'haml', 'hh', 'java', 'js', 'less', 'log', 'm', 'make', 'md', 'ml', 'mm', 'php', 'pl', 'plist', 'properties', 'py', 'rb', 'rst', 'sass', 'scala', 'script', 'scm', 'sml', 'sql', 'sh', 'tsv', 'txt', 'vi', 'vim', 'webdoc', 'yaml'],
        JS: [`${STATIC_URI}highlight.min.js`, 'text.js'],
        CSS: [`${STATIC_URI}github.css`, 'text.css'],
        NAME: 'Text',
        PREFETCH: 'xhr',
        ASSET: ''
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
}

export default new TextLoader();
