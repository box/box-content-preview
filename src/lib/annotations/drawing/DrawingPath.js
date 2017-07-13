class DrawingPath {
    //--------------------------------------------------------------------------
    // Typedef
    //--------------------------------------------------------------------------

    /**
     * Keeps track of a drawn path and its boundaries
     * @typedef {Object} AnnotatorData
     */

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /** @property {Array} - The array of coordinates that form the path */
    path;
    /** @property {number} - The maximum X position of all coordinates */
    maxX;
    /** @property {number} - The maximum Y position of all coordinates */
    maxY;
    /** @property {number} - The minimum X position of all coordinates */
    minX;
    /** @property {number} - The minimum Y position of all coordinates */
    minY;

    /**
     * [constructor]
     * @return {DrawingPath} DrawingPath instance
     */
    constructor() {
        this.path = [];
        this.maxX = -Infinity;
        this.maxY = -Infinity;
        this.minX = Infinity;
        this.minY = Infinity;
    }

    /**
     * Add position to coordinates and update the bounding box
     *
     * @param {number} xPos xPosition to be part of the drawing
     * @param {number} yPos yPosition to be part of the drawing
     * @return {void}
     */
    addCoordinate(xPos, yPos) {
        if (xPos < this.minX) {
            this.minX = xPos;
        }
        if (xPos < this.maxX) {
            this.maxX = xPos;
        }
        if (yPos < this.minY) {
            this.minY = yPos;
        }
        if (yPos < this.maxY) {
            this.maxY = yPos;
        }
        this.path.push({
            x: xPos,
            y: yPos
        });
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
     * Draw the recorded coordinates onto a CanvasContext
     *
     * @param {CanvasContext} context Context to draw the recorded path on
     * @return {void}
     */
    drawPath(context) {
        const ctx = context;
        if (ctx) {
            ctx.beginPath();
            for (let i = 0; i < this.path.length; i++) {
                let xLast;
                let yLast;

                if (i > 0) {
                    xLast = this.path[i - 1].x;
                    yLast = this.path[i - 1].y;
                } else {
                    xLast = this.path[i].x - 1;
                    yLast = this.path[i].y;
                    ctx.moveTo(xLast, yLast);
                }

                // Arithmetic shift right here is faster but less accurate
                const xMid = (this.path[i].x + xLast) / 2;
                const yMid = (this.path[i].y + yLast) / 2;
                // lineTo is much faster than quadraticCurveTo but less smooth
                ctx.quadraticCurveTo(xLast, yLast, xMid, yMid);
            }
            ctx.stroke();
        }
    }
}

export default DrawingPath;
