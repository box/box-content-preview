'use strict';

import AssetLoader from '../asset-loader';

const STATIC_URI = 'third-party/text/';

// Order of the viewers matters. Prefer original before others. Go from specific to general.
const VIEWERS = [
    {
        REPRESENTATION: 'original',
        EXTENSIONS: [ 'md' ],
        SCRIPTS: [ STATIC_URI + 'highlight.js', 'markdown.js' ],
        STYLESHEETS: [ STATIC_URI + 'github.css', 'markdown.css' ],
        CONSTRUCTOR: 'MarkDown',
        PREFETCH: 'xhr'
    },
    {
        REPRESENTATION: 'original',
        EXTENSIONS: [ 'csv' ],
        SCRIPTS: [ STATIC_URI + 'papaparse.js', 'csv.js' ],
        STYLESHEETS: [ 'csv.css' ],
        CONSTRUCTOR: 'CSV'
    },
    {
        REPRESENTATION: 'original',
        EXTENSIONS: [ 'as', 'as3', 'asm', 'bat', 'c', 'cc', 'cmake', 'cpp', 'cs', 'css', 'cxx', 'diff', 'erb', 'groovy', 'h', 'haml', 'hh', 'htm', 'html', 'java', 'js', 'less', 'm', 'make', 'ml', 'mm', 'php', 'pl', 'plist', 'properties', 'py', 'rb', 'rst', 'sass', 'scala', 'script', 'scm', 'sml', 'sql', 'sh', 'tsv', 'txt', 'vi', 'vim', 'webdoc', 'yaml' ],
        SCRIPTS: [  STATIC_URI + 'highlight.js', 'text.js' ],
        STYLESHEETS: [ STATIC_URI + 'github.css', 'text.css' ],
        CONSTRUCTOR: 'Text',
        PREFETCH: 'xhr'
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