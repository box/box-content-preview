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
        this.pdfLinkService = new this.pdfjsViewer.PDFLinkService();
        this.pdfFindController = new this.pdfjsViewer.PDFFindController({
            linkService: this.pdfLinkService
        });

        return new this.pdfjsViewer.PDFSinglePageViewer({
            container: this.docEl,
            enhanceTextSelection: !this.isMobile, // Uses more memory, so disable on mobile
            findController: this.pdfFindController,
            linkService: this.pdfLinkService
        });
    }
}

export default SinglePageViewer;
