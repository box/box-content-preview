import * as annotatorUtil from '../annotatorUtil';

const IMAGE_PADDING = 15;
const ROTATION_ONCE_DEG = -90;
const ROTATION_TWICE_DEG = -180;
const ROTATION_THRICE_DEG = -270;

/**
 * Adjust initial annotation location according to current image rotation
 *
 * @param {number} x - Annotation location x coordinate
 * @param {number} y - Annotation location y coordinate
 * @param {number} rotation - Current image rotation
 * @param {Object} imageDimensions - Image dimensions
 * @param {number} scale - Zoom scale
 * @return {number[]} [x,y] browser coordinates
 */
export function getRotatedLocation(x, y, rotation, imageDimensions, scale) {
    const { height, width } = imageDimensions;
    const scaledWidth = width / scale;
    const scaledHeight = height / scale;

    switch (rotation) {
        case ROTATION_ONCE_DEG:
            return [y, scaledHeight - x];
        case ROTATION_TWICE_DEG:
            return [scaledWidth - x, scaledHeight - y];
        case ROTATION_THRICE_DEG:
            return [scaledWidth - y, x];
        default:
            break;
    }

    return [x, y];
}

/**
 * Adjust initial annotation location according to current image rotation
 *
 * @param {number} x - Annotation location x coordinate
 * @param {number} y - Annotation location y coordinate
 * @param {number} rotation - Current image rotation
 * @param {Object} imageDimensions - Image dimensions
 * @param {number} scale - Zoom scale
 * @return {number[]} [x,y] browser coordinates
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
 * Returns number of pixels above the image when it's not rotated
 *
 * @param {HTMLElement} imageEl - HTML element for image
 * @param {boolean} isRotated - Whether or not image is rotated
 * @return {number} Number of pixels above the image
 */
export function getRotatedPadding(imageEl, isRotated) {
    return isRotated ? imageEl.offsetLeft - IMAGE_PADDING * 3 / 2 : imageEl.offsetTop;
}

/**
 * Returns browser coordinates given an annotation location object and
 * the HTML element being annotated on.
 *
 * @param {Object} location - Annotation location object
 * @param {HTMLElement} annotatedElement - HTML element being annotated on
 * @return {number[]} [x,y] browser coordinates
 */
export function getBrowserCoordinatesFromLocation(location, annotatedElement) {
    const imageEl =
        annotatedElement.querySelector(`[data-page-number="${location.page || 1}"]`) ||
        annotatedElement.querySelector('img');
    const wrapperDimensions = annotatedElement.getBoundingClientRect();
    const imageDimensions = imageEl.getBoundingClientRect();
    const scale = annotatorUtil.getScale(annotatedElement);

    // Get image padding
    const topPadding = imageDimensions.top - wrapperDimensions.top + annotatedElement.scrollTop;
    const leftPadding = imageDimensions.left - wrapperDimensions.left + annotatedElement.scrollLeft;

    // Adjust annotation location if image is rotated
    const rotation = Number(imageEl.getAttribute('data-rotation-angle'));
    let [x, y] = getRotatedLocation(location.x, location.y, rotation, imageDimensions, scale);

    x *= scale;
    y *= scale;

    // Add padding based on current zoom
    if (leftPadding >= 0) {
        x += leftPadding;
    }

    if (topPadding >= 0) {
        y += topPadding;
    }

    // Removes extra padding if image is flipped upside down
    if (rotation === ROTATION_TWICE_DEG) {
        y -= IMAGE_PADDING / 2;
    }

    return [x, y];
}
