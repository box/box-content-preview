import DocumentViewer from './DocumentViewer';

class SinglePageViewer extends DocumentViewer {
    //--------------------------------------------------------------------------
    // Protected
    //--------------------------------------------------------------------------

    /**
     * Initialize pdf.js viewer.
     *
     * @protected
     * @override
     * @return {pdfjsViewer.PDFViewer} PDF viewer type
     */
    initPdfViewer() {
        return this.initPdfViewerClass(this.pdfjsViewer.PDFSinglePageViewer);
    }
}

export default SinglePageViewer;
