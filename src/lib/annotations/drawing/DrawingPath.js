import * as docAnnotatorUtil from '../doc/docAnnotatorUtil';
import { createLocation } from '../annotatorUtil';

/* eslint-disable prefer-template */
/**
 * Round a number to a certain decimal place by concatenating an exponential factor. Credits to lodash library.
 *
 * @param {number} number - The number to be rounded
 * @param {number} precision - The amount of decimal places to keep
 * @return {number} The rounded number
 */
const Round = (number, precision) => {
    let pair = (number + 'e').split('e');
    const value = Math.round(pair[0] + 'e' + (+pair[1] + precision));
    pair = (value + 'e').split('e');
    return +(pair[0] + 'e' + (+pair[1] - precision));
};
/* eslint-enable prefer-template */

class DrawingPath {
    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------
    /** @property {Array} - The array of coordinates that form the path */
    path = [];

    /** @property {Array} - The path coordinates translated into browser space */
    browserPath = [];

    /** @property {number} - The maximum X position of all coordinates */
    maxX = -Infinity;

    /** @property {number} - The maximum Y position of all coordinates */
    maxY = -Infinity;

    /** @property {number} - The minimum X position of all coordinates */
    minX = Infinity;

    /** @property {number} - The minimum Y position of all coordinates */
    minY = Infinity;

    /**
     * [constructor]
     *
     * @param {Object} drawingPathData - The drawingPath object data to be instantiated into an object
     * @return {DrawingPath} A DrawingPath instance
     */
    constructor(drawingPathData) {
        if (drawingPathData) {
            this.path = drawingPathData.path.map((num) => createLocation(parseFloat(num.x), parseFloat(num.y)));
            this.maxX = drawingPathData.maxX;
            this.minX = drawingPathData.minX;
            this.maxY = drawingPathData.maxY;
            this.minY = drawingPathData.minY;
        }
    }

    /**
     * Add position to coordinates and update the bounding box
     *
     * @param {Location} documentLocation - Original document location coordinate to be part of the drawing path
     * @param {Location} [browserLocation] - Optional browser position to be saved to browserPath
     * @return {void}
     */
    addCoordinate(documentLocation, browserLocation) {
        if (!documentLocation) {
            return;
        }

        // OPTIMIZE (@minhnguyen): We convert a number to a string using toFixed and then back a number.
        //           As a result, it might be better to truncate only on annotation save.
        const x = Round(documentLocation.x, 2);
        const y = Round(documentLocation.y, 2);

        if (x < this.minX) {
            this.minX = x;
        }

        if (y < this.minY) {
            this.minY = y;
        }

        if (y > this.maxY) {
            this.maxY = y;
        }

        if (x > this.maxX) {
            this.maxX = x;
        }

        this.path.push(createLocation(x, y));
        if (browserLocation) {
            this.browserPath.push(browserLocation);
        }
    }

    /**
     * Determine if any coordinates are contained in the DrawingPath
     *
     * @return {boolean} Whether or not any coordinates have been recorded
     */
    isEmpty() {
        return this.path.length === 0;
    }

    /**
     * Draw the recorded browser coordinates onto a CanvasContext. Requires a browser path to be generated.
     *
     * @param {CanvasContext} drawingContext - Context to draw the recorded path on
     * @return {void}
     */
    drawPath(drawingContext) {
        const ctx = drawingContext;
        if (!ctx || !this.browserPath) {
            return;
        }

        const pathLen = this.browserPath.length;
        for (let i = 0; i < pathLen; i++) {
            let xLast;
            let yLast;

            if (i > 0) {
                xLast = this.browserPath[i - 1].x;
                yLast = this.browserPath[i - 1].y;
            } else {
                xLast = this.browserPath[i].x;
                yLast = this.browserPath[i].y;
                ctx.moveTo(xLast, yLast);
            }

            const xMid = (this.browserPath[i].x + xLast) / 2;
            const yMid = (this.browserPath[i].y + yLast) / 2;
            ctx.quadraticCurveTo(xLast, yLast, xMid, yMid);
        }
    }

    /**
     * Generate a browser location path that can be drawn on a canvas document from the stored path information
     *
     * @param {HTMLElement} annotatedElement - The annotated element
     * @param {Object} dimensions - The dimension object
     * @param {number} dimensions.x - The dimension width
     * @param {number} dimensions.y - The dimension height
     * @return {void}
     */
    generateBrowserPath(annotatedElement, dimensions) {
        if (!this.path) {
            return;
        }

        // create a browser coordinate path from the document location path
        this.browserPath = this.path.map((coord) => {
            const reconstructedLocation = createLocation(coord.x, coord.y, dimensions);
            const [xNew, yNew] = docAnnotatorUtil.getBrowserCoordinatesFromLocation(
                reconstructedLocation,
                annotatedElement
            );
            return createLocation(xNew, yNew);
        });
    }

    /**
     * Extract path information from the drawing path
     *
     * @param {DrawingPath} drawingPath - The drawingPath to extract information from
     * @return {void}
     */
    static extractDrawingInfo(drawingPath) {
        return {
            path: drawingPath.path
        };
    }
}

export default DrawingPath;
