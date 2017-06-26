import rangy from 'rangy';
/* eslint-disable no-unused-vars */
// Workaround for rangy npm issue: https://github.com/timdown/rangy/issues/342
import rangyClassApplier from 'rangy/lib/rangy-classapplier';
import rangyHighlight from 'rangy/lib/rangy-highlighter';
import rangySaveRestore from 'rangy/lib/rangy-selectionsaverestore';
/* eslint-enable no-unused-vars */
import * as docAnnotatorUtil from './docAnnotatorUtil';
import * as annotatorUtil from '../annotatorUtil';
import { ACTIVE_STATES, ANNOTATION_TYPE_HIGHLIGHT } from '../annotationConstants';
import { PAGE_PADDING_BOTTOM, PAGE_PADDING_TOP } from './documentConstants';

export default class DocHighlightAnnotator {
    highlighter;

    constructor() {
        // Init rangy and rangy highlight
        this.highlighter = rangy.createHighlighter();
        this.highlighter.addClassApplier(
            rangy.createClassApplier('rangy-highlight', {
                ignoreWhiteSpace: true,
                tagNames: ['span', 'a']
            })
        );
    }

    /**
     * Returns an annotation location on a document from the DOM event or null
     * if no correct annotation location can be inferred from the event. The PDF 
     * quad points as defined by the PDF spec and page the highlight is on.
     *
     * @override
     * @param {Event} event - DOM event
     * @param {number} zoomScale - The scale of the zoomed document
     * @return {Object|null} Location object
     */
    getLocationFromEvent(event, zoomScale) {
        if (!docAnnotatorUtil.isSelectionPresent()) {
            return null;
        }

        // Get correct page
        let { pageEl, page } = annotatorUtil.getPageInfo(event.target);
        if (page === -1) {
            // The ( .. ) around assignment is required syntax
            ({ pageEl, page } = annotatorUtil.getPageInfo(window.getSelection().anchorNode));
        }

        // We save the dimensions of the annotated element scaled to 100%
        // so we can compare to the annotated element during render time
        // and scale if needed (in case the representation changes size)
        const pageDimensions = pageEl.getBoundingClientRect();
        const pageWidth = pageDimensions.width;
        const pageHeight = pageDimensions.height - PAGE_PADDING_TOP - PAGE_PADDING_BOTTOM;
        const dimensions = {
            x: pageWidth / zoomScale,
            y: pageHeight / zoomScale
        };

        return { page, dimensions };
    }

    generateQuadPoints(event, zoomScale) {
        // Get correct page
        let { pageEl, page } = annotatorUtil.getPageInfo(event.target);
        if (page === -1) {
            // The ( .. ) around assignment is required syntax
            ({ pageEl, page } = annotatorUtil.getPageInfo(window.getSelection().anchorNode));
        }

        // Use Rangy to save the current selection because using the
        // highlight module can mess with the selection. We restore this
        // selection after we clean up the highlight
        const savedSelection = rangy.saveSelection();

        // Use highlight module to calculate quad points
        const { highlight, highlightEls } = docAnnotatorUtil.getHighlightAndHighlightEls(this.highlighter, pageEl);

        // Do not create highlight annotation if no highlights are detected
        if (highlightEls.length === 0) {
            return null;
        }

        const quadPoints = [];
        highlightEls.forEach((element) => {
            quadPoints.push(docAnnotatorUtil.getQuadPoints(element, pageEl, zoomScale));
        });

        // Remove rangy highlight and restore selection
        this.removeRangyHighlight(highlight);
        rangy.restoreSelection(savedSelection);

        return quadPoints;
    }

    /**
     * Helper to remove a Rangy highlight by deleting the highlight in the
     * internal highlighter list that has a matching ID. We can't directly use
     * the highlighter's removeHighlights since the highlight could possibly
     * not be a true Rangy highlight object.
     *
     * @private
     * @param {Object} highlight - Highlight to delete.
     * @return {void}
     */
    removeRangyHighlight(highlight) {
        const highlights = this.highlighter.highlights;
        if (!Array.isArray(highlights)) {
            return;
        }

        const matchingHighlights = highlights.filter((internalHighlight) => {
            return internalHighlight.id === highlight.id;
        });

        this.highlighter.removeHighlights(matchingHighlights);
    }
}
