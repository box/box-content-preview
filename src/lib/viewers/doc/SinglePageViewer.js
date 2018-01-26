import DocumentViewer from './DocumentViewer';

class SinglePageViewer extends DocumentViewer {
    //--------------------------------------------------------------------------
    // Protected
    //--------------------------------------------------------------------------

    /**
     * Get pdf.js viewer.
     *
     * @protected
     * @override
     * @return {PDFJS.PDFViewer} PDF viewer type
     */
    getPdfViewer() {
        return new PDFJS.PDFSinglePageViewer({
            container: this.docEl,
            linkService: new PDFJS.PDFLinkService(),
            // Enhanced text selection uses more memory, so disable on mobile
            enhanceTextSelection: !this.isMobile
        });
    }
}

export default SinglePageViewer;
