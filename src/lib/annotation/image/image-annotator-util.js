/**
 * @fileoverview Image annotator utility functions.
 * @author spramod
 */

import * as annotatorUtil from '../annotator-util';

const IMAGE_PADDING = 15;
const ROTATION_ONCE_DEG = -90;
const ROTATION_TWICE_DEG = -180;
const ROTATION_THRICE_DEG = -270;

/**
 * Adjust initial annotation location according to current image rotation
 * @param {Number} x Annotation location x coordinate
 * @param {Number} y Annotation location y coordinate
 * @param {Number} rotation Current image rotation
 * @param {Object} imageDimensions
 * @param {Number} scale
 * @returns {Number[]} [x,y] browser coordinates
 */
export function getRotatedLocation(x, y, rotation, imageDimensions, scale) {
    const { height, width } = imageDimensions;

    switch (rotation) {
        case ROTATION_ONCE_DEG:
            return [y, height / scale - x];
        case ROTATION_TWICE_DEG:
            return [width / scale - x, height / scale - y];
        case ROTATION_THRICE_DEG:
            return [width / scale - y, x];
        default:
            break;
    }
    return [x, y];
}

/**
 * Adjust initial annotation location according to current image rotation
 * @param {Number} x Annotation location x coordinate
 * @param {Number} y Annotation location y coordinate
 * @param {Number} rotation Current image rotation
 * @param {Object} imageDimensions
 * @param {Number} scale
 * @returns {Number[]} [x,y] browser coordinates
 */
export function getLocationWithoutRotation(x, y, rotation, imageDimensions, scale) {
    const { height, width } = imageDimensions;

    switch (rotation) {
        case ROTATION_ONCE_DEG:
            return [width / scale - y, x];
        case ROTATION_TWICE_DEG:
            return [width / scale - x, height / scale - y];
        case ROTATION_THRICE_DEG:
            return [y, height / scale - x];
        default:
            break;
    }
    return [x, y];
}


/**
 * Returns browser coordinates given an annotation location object and
 * the HTML element being annotated on.
 * @param {Object} location Annotation location object
 * @param {HTMLElement} annotatedElement HTML element being annotated on
 * @returns {Number[]} [x,y] browser coordinates
 */
export function getBrowserCoordinatesFromLocation(location, annotatedElement) {
    const imageEl = annotatedElement.querySelector('img');
    const wrapperDimensions = annotatedElement.getBoundingClientRect();
    const imageDimensions = imageEl.getBoundingClientRect();
    const scale = annotatorUtil.getScale(annotatedElement);

    // Get image padding
    const topImagePadding = Math.floor(IMAGE_PADDING / 2);
    const topPadding = imageDimensions.top - wrapperDimensions.top - topImagePadding;
    const leftPadding = imageDimensions.left - wrapperDimensions.left;

    // Adjust annotation location if image is rotated
    // todo(@spramod): Fix annotation locations on zoom when rotated
    const rotation = Number(imageEl.getAttribute('data-rotation-angle'));
    let [x, y] = getRotatedLocation(location.x, location.y, rotation, imageDimensions, scale);

    // Scale coordinates to new image size
    x *= scale;
    y *= scale;

    // Add padding based on current zoom
    if (leftPadding >= 0) {
        x += leftPadding;
    }

    if (topPadding >= 0) {
        y += topPadding;
    } else if (rotation === ROTATION_TWICE_DEG) {
        y -= topImagePadding;
    }

    return [x, y];
}
