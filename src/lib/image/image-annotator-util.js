/**
 * @fileoverview Image annotator utility functions.
 * @author spramod
 */

import * as annotatorUtil from '../annotation/annotator-util';

const IMAGE_PADDING = 15;

/**
 * Returns browser coordinates given an annotation location object and
 * the HTML element being annotated on.
 * @param {Object} location Annotation location object
 * @param {HTMLElement} annotatedElement HTML element being annotated on
 * @returns {Number[]} [x,y] browser coordinates
 */
export function getBrowserCoordinatesFromLocation(location, annotatedElement) {
    const imageEl = annotatedElement.getElementsByTagName('img')[0];
    const wrapperDimensions = annotatedElement.getBoundingClientRect();
    const imageDimensions = imageEl.getBoundingClientRect();
    const scale = annotatorUtil.getScale(annotatedElement);
    let [x, y] = [location.x, location.y];

    // Scale coordinates to new image size
    x *= scale;
    y *= scale;

    // Adjust coordinates if image is smaller than preview area
    const topImagePadding = Math.floor(IMAGE_PADDING / 2);
    const topPadding = imageDimensions.top - wrapperDimensions.top - topImagePadding;
    const leftPadding = imageDimensions.left - wrapperDimensions.left;
    if (topPadding > 0) {
        y += topPadding;
    }
    if (leftPadding >= 0) {
        x += leftPadding;
    }

    return [x, y];
}
