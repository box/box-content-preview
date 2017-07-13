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
    /**
     * [constructor]
     * @return {DrawingPath} DrawingPath instance
     */
    constructor() {
        this.path = [];
        this.minX = undefined;
        this.minY = undefined;
        this.maxX = undefined;
        this.maxY = undefined;
    }

    /**
     * Add position to coordinates and update the bounding box
     *
     * @param {number} xPos xPosition to be part of the drawing
     * @param {number} yPos yPosition to be part of the drawing
     * @return {void}
     */
    addCoordinate(xPos, yPos) {
        if (this.minX === undefined || xPos < this.minX) {
            this.minX = xPos;
        }
        if (this.maxX === undefined || xPos < this.maxX) {
            this.maxX = xPos;
        }
        if (this.minY === undefined || yPos < this.minY) {
            this.minY = yPos;
        }
        if (this.maxY === undefined || yPos < this.maxY) {
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
