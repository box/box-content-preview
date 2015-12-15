'use strict';

import AssetLoader from '../asset-loader';

// Order of the viewers matters. Prefer original before others. Go from specific to general.
const VIEWERS = [
    {
        REPRESENTATION: 'original',
        EXTENSIONS: [ 'md' ],
        SCRIPTS: [ 'highlight.js', 'markdown.js' ],
        STYLESHEETS: [ 'markdown.css', 'github.css' ],
        CONSTRUCTOR: 'MarkDown'
    },
    {
        REPRESENTATION: 'original',
        EXTENSIONS: [ 'csv' ],
        SCRIPTS: [ 'papaparse.js', 'csv.js' ],
        STYLESHEETS: [ 'csv.css' ],
        CONSTRUCTOR: 'CSV'
    },
    {
        REPRESENTATION: 'original',
        EXTENSIONS: [ 'as', 'as3', 'asm', 'bat', 'c', 'cc', 'cmake', 'cpp', 'cs', 'css', 'cxx', 'diff', 'erb', 'groovy', 'h', 'haml', 'hh', 'htm', 'html', 'java', 'js', 'less', 'm', 'make', 'ml', 'mm', 'php', 'pl', 'plist', 'properties', 'py', 'rb', 'rst', 'sass', 'scala', 'script', 'scm', 'sml', 'sql', 'sh', 'tsv', 'txt', 'vi', 'vim', 'webdoc', 'yaml' ],
        SCRIPTS: [ 'highlight.js', 'text.js' ],
        STYLESHEETS: [ 'text.css', 'github.css' ],
        CONSTRUCTOR: 'Text'
    }
];

class TextLoader extends AssetLoader {

    /**
     * [constructor]
     * @returns {TextLoader} TextLoader instnace
     */
    constructor() {
        super();
        this.viewers = VIEWERS;
    }
}

export default new TextLoader();