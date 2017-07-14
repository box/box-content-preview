import * as docAnnotatorUtil from './docAnnotatorUtil';
import * as annotatorUtil from '../annotatorUtil';
import {
    DATA_TYPE_ANNOTATION_DIALOG,
    DATA_TYPE_ANNOTATION_INDICATOR,
    PAGE_PADDING_BOTTOM,
    PAGE_PADDING_TOP
} from '../annotationConstants';

export default class PointHighlightAnnotator {
    /**
     * Returns an annotation location on a document from the DOM event or null
     * if no correct annotation location can be inferred from the event. Return
     * the (x, y) coordinates and page the point is on in PDF units with the
     * lower left corner of the document as the origin.
     *
     * @override
     * @param {Event} event - DOM event
     * @param {number} zoomScale - The scale of the zoomed document
     * @return {Object|null} Location object
     */
    getLocationFromEvent(event, zoomScale) {
        // If there is a selection, ignore
        if (docAnnotatorUtil.isSelectionPresent()) {
            return null;
        }

        // If click isn't on a page, ignore
        const eventTarget = event.target;
        const { pageEl, page } = annotatorUtil.getPageInfo(eventTarget);
        if (!pageEl) {
            return null;
        }

        // If click is inside an annotation dialog, ignore
        const dataType = annotatorUtil.findClosestDataType(eventTarget);
        if (dataType === DATA_TYPE_ANNOTATION_DIALOG || dataType === DATA_TYPE_ANNOTATION_INDICATOR) {
            return null;
        }

        // Store coordinates at 100% scale in PDF space in PDF units
        const pageDimensions = pageEl.getBoundingClientRect();
        const pageWidth = pageDimensions.width;
        const pageHeight = pageDimensions.height - PAGE_PADDING_TOP - PAGE_PADDING_BOTTOM;
        const browserCoordinates = [
            event.clientX - pageDimensions.left,
            event.clientY - pageDimensions.top - PAGE_PADDING_TOP
        ];
        const pdfCoordinates = docAnnotatorUtil.convertDOMSpaceToPDFSpace(browserCoordinates, pageHeight, zoomScale);
        const [x, y] = pdfCoordinates;

        // We save the dimensions of the annotated element scaled to 100%
        // so we can compare to the annotated element during render time
        // and scale if needed (in case the representation changes size)
        const dimensions = {
            x: pageWidth / zoomScale,
            y: pageHeight / zoomScale
        };

        return { x, y, page, dimensions };
    }
}
