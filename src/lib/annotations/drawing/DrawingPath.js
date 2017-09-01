import { createLocation, round } from '../annotatorUtil';

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
            this.path = drawingPathData.path.map((num) => {
                const x = +num.x;
                const y = +num.y;

                this.minX = Math.min(this.minX, x);
                this.maxX = Math.max(this.maxX, x);
                this.minY = Math.min(this.minY, y);
                this.maxY = Math.max(this.maxY, y);

                return createLocation(x, y);
            });
        }
    }

    /**
     * Add position to coordinates and update the bounding box
     *
     * @public
     * @param {Location} documentLocation - Original document location coordinate to be part of the drawing path
     * @param {Location} [browserLocation] - Optional browser position to be saved to browserPath
     * @return {void}
     */
    addCoordinate(documentLocation, browserLocation) {
        if (!documentLocation || !documentLocation.x || !documentLocation.y) {
            return;
        }

        // OPTIMIZE (@minhnguyen): We convert a number to a string using toFixed and then back a number.
        //           As a result, it might be better to truncate only on annotation save.
        const x = round(documentLocation.x, 2);
        const y = round(documentLocation.y, 2);

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
        if (browserLocation && browserLocation.x && browserLocation.y) {
            this.browserPath.push(browserLocation);
        }
    }

    /**
     * Determine if any coordinates are contained in the DrawingPath
     *
     * @public
     * @return {boolean} Whether or not any coordinates have been recorded
     */
    isEmpty() {
        return this.path.length === 0;
    }

    /**
     * Draw the recorded browser coordinates onto a CanvasContext. Requires a browser path to have been generated.
     *
     * @public
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
     * @public
     * @param {Function} coordinateToBrowserCoordinate - A function that takes a document location and returns
     *                                                   the corresponding browser location
     * @return {void}
     */
    generateBrowserPath(coordinateToBrowserCoordinate) {
        if (!this.path) {
            return;
        }

        // create a browser coordinate path from the document location path
        this.browserPath = this.path.map(coordinateToBrowserCoordinate);
    }

    /**
     * Extract the path information from two paths by merging their paths and getting the bounding rectangle
     *
     * @public
     * @param {DrawingPath} pathA - Another drawingPath to extract information from
     * @param {Object} accumulator - A drawingPath accumulator to retain boundary and path information
     * @return {Object} A bounding rectangle and the stroke paths it contains
     */
    static extractDrawingInfo(pathA, accumulator) {
        let paths = accumulator.paths;
        const apath = { path: pathA.path };
        if (!paths) {
            paths = [apath];
        } else {
            paths.push(apath);
        }

        return {
            minX: accumulator.minX ? Math.min(accumulator.minX, pathA.minX) : pathA.minX,
            maxX: accumulator.maxX ? Math.max(accumulator.maxX, pathA.maxX) : pathA.maxX,
            minY: accumulator.minY ? Math.min(accumulator.minY, pathA.minY) : pathA.minY,
            maxY: accumulator.maxY ? Math.max(accumulator.maxY, pathA.maxY) : pathA.maxY,
            paths
        };
    }
}

export default DrawingPath;
