'use strict';

import AssetLoader from '../assets';

const VIEWERS = [
    {
        REPRESENTATION: 'pdf',
        EXTENSIONS: [ 'doc', 'docx', 'gdoc', 'gsheet', 'msg', 'odp', 'odt', 'ods', 'ppt', 'pptx', 'rtf', 'wpd', 'xhtml', 'xls', 'xlsm', 'xlsx', 'xml', 'xsd', 'xsl' ],
        SCRIPTS: [ 'compatibility.js', 'pdf.worker.js', 'pdf.js', 'pdf_viewer.js', 'doc.js' ],
        STYLESHEETS: [ 'pdf_viewer.css', 'doc.css' ],
        CONSTRUCTOR: 'Doc'
    },
    {
        REPRESENTATION: 'original',
        EXTENSIONS: [ 'pdf' ],
        SCRIPTS: [ 'compatibility.js', 'pdf.worker.js', 'pdf.js', 'pdf_viewer.js', 'doc.js' ],
        STYLESHEETS: [ 'pdf_viewer.css', 'doc.css' ],
        CONSTRUCTOR: 'Doc'
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
