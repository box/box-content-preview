import autobind from 'autobind-decorator';
import ImageAnnotator from './ImageAnnotator';

@autobind
class MultiImageAnnotator extends ImageAnnotator {

    //--------------------------------------------------------------------------
    // Abstract Implementations
    //--------------------------------------------------------------------------

    /**
     * Returns an annotation location on an image from the DOM event or null
     * if no correct annotation location can be inferred from the event. For
     * point annotations, we return the (x, y) coordinates for the point
     * with the top left corner of the image as the origin.
     *
     * @override
     * @param {Event} event - DOM event
     * @return {Object|null} Location object
     */
    getLocationFromEvent(event) {
        const location = super.getLocationFromEvent(event);

        if (!location) {
            return null;
        }

        // If no page was selected, ignore
        const page = Number(event.target.getAttribute('data-page-number'));
        if (!page) {
            return null;
        }

        return { page, ...location };
    }
}

export default MultiImageAnnotator;
