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
     * @return {Object} PDF viewer type
     */
    initPdfViewer() {
        return new this.pdfjsViewer.PDFSinglePageViewer({
            container: this.docEl,
            linkService: new this.pdfjsViewer.PDFLinkService(),
            // Enhanced text selection uses more memory, so disable on mobile
            enhanceTextSelection: !this.isMobile
        });
    }
}

export default SinglePageViewer;
