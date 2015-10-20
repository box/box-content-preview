'use strict';

import Promise from 'bluebird';
import AssetLoader from '../assets';

const VIEWERS = [
    {
        REPRESENTATION: 'pdf',
        EXTENSIONS: [ 'doc', 'docx', 'gdoc', 'gsheet', 'htm', 'html', 'msg', 'odp', 'odt', 'ods', 'pdf', 'ppt', 'pptx', 'rtf', 'tsv', 'wpd', 'xhtml', 'xls', 'xlsm', 'xlsx', 'xml', 'xsd', 'xsl' ],
        SCRIPTS: [ 'pdf.js' ],
        STYLESHEETS: [ 'pdf.css' ],
        CONSTRUCTOR: 'PDF'
    }
];

class DocLoader extends AssetLoader {

    /**
     * [constructor]
     * @returns {DocLoader}
     */
    constructor() {
        super();
        this.viewers = VIEWERS;
    }
}

export default new DocLoader();