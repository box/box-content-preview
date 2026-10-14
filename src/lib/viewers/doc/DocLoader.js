import AssetLoader from '../AssetLoader';
import { getRepresentation } from '../../file';
import AutoCADViewer from './AutoCADViewer';
import DocumentViewer from './DocumentViewer';
import PresentationViewer from './PresentationViewer';
import SinglePageViewer from './SinglePageViewer';
import RepStatus from '../../RepStatus';
import { ORIGINAL_REP_NAME, STATUS_ERROR, STATUS_SUCCESS } from '../../constants';
import { DOCUMENT_EXTENSIONS } from '../../extensions';

// Order of the viewers matters. For example, a PDF file can be previewed by using the preferred optimized 'pdf' rep
// or the original as a fallback. Additionally, we include multiple entries for the presentation viewer so that it can be
// used by other docoument types if the document viewer is disabled.
const VIEWERS = [
    {
        NAME: 'Presentation',
        CONSTRUCTOR: PresentationViewer,
        REP: 'pdf',
        EXT: ['gslide', 'gslides', 'odp', 'ppt', 'pptx', 'key'],
    },
    {
        NAME: 'AutoCAD',
        CONSTRUCTOR: AutoCADViewer,
        REP: 'pdf',
        EXT: ['dwg'],
    },
    // Prefer the searchable 'ocr_pdf' rep over 'pdf'
    {
        NAME: 'Document',
        CONSTRUCTOR: DocumentViewer,
        REP: 'ocr_pdf',
        EXT: DOCUMENT_EXTENSIONS,
    },
    {
        NAME: 'Document',
        CONSTRUCTOR: DocumentViewer,
        REP: 'pdf',
        EXT: DOCUMENT_EXTENSIONS,
    },
    // Allows other document types to use the presentation viewer when the document viewer is disabled.
    {
        NAME: 'Presentation',
        CONSTRUCTOR: PresentationViewer,
        REP: 'pdf',
        EXT: DOCUMENT_EXTENSIONS,
    },
    {
        NAME: 'SinglePage',
        CONSTRUCTOR: SinglePageViewer,
        REP: 'pdf',
        EXT: DOCUMENT_EXTENSIONS,
    },
    {
        NAME: 'Document',
        CONSTRUCTOR: DocumentViewer,
        REP: ORIGINAL_REP_NAME,
        EXT: ['pdf', 'lcdpdf'],
    },
    //  Allows PDFs and lcpdf files that only have an original rep
    // to use the presentation viewer when the document viewer is disabled.
    {
        NAME: 'Presentation',
        CONSTRUCTOR: PresentationViewer,
        REP: ORIGINAL_REP_NAME,
        EXT: ['pdf', 'lcdpdf'],
    },
    {
        NAME: 'SinglePage',
        CONSTRUCTOR: SinglePageViewer,
        REP: ORIGINAL_REP_NAME,
        EXT: ['pdf', 'lcdpdf'],
    },
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
        let rep = super.determineRepresentation(file, viewer);
        let status = RepStatus.getStatus(rep);

        if (rep.representation === 'ocr_pdf' && status === STATUS_ERROR) {
            rep = getRepresentation(file, 'pdf') || rep;
            status = RepStatus.getStatus(rep);
        }

        if (file.extension === 'pdf' && rep.representation !== ORIGINAL_REP_NAME && status !== STATUS_SUCCESS) {
            rep = getRepresentation(file, ORIGINAL_REP_NAME) || rep;
        }

        return rep;
    }
}

export default new DocLoader();
