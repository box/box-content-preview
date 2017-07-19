class DrawingPath {
    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------
    /** @property {Array} - The array of coordinates that form the path */
    path = [];

    /** @property {number} - The maximum X position of all coordinates */
    maxX = -Infinity;

    /** @property {number} - The maximum Y position of all coordinates */
    maxY = -Infinity;

    /** @property {number} - The minimum X position of all coordinates */
    minX = Infinity;

    /** @property {number} - The minimum Y position of all coordinates */
    minY = Infinity;

    /**
     * Add position to coordinates and update the bounding box
     *
     * @param {number} xPos - xPosition to be part of the drawing
     * @param {number} yPos - yPosition to be part of the drawing
     * @return {void}
     */
    addCoordinate(xPos, yPos) {
        if (!xPos || !yPos) {
            return;
        }

        const x = parseFloat(xPos.toFixed(2));
        const y = parseFloat(yPos.toFixed(2));
        // OPTIMIZE (minhnguyen): We convert a number to a string using toFixed and then back a number.
        //           As a result, it might be better to truncate only on annotation save.
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

        this.path.push({
            x,
            y
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
     * @param {CanvasContext} context - Context to draw the recorded path on
     * @return {void}
     */
    drawPath(context) {
        const ctx = context;
        if (!ctx) {
            return;
        }

        ctx.beginPath();
        const pathLen = this.path.length;
        for (let i = 0; i < pathLen; i++) {
            let xLast;
            let yLast;

            if (i > 0) {
                xLast = this.path[i - 1].x;
                yLast = this.path[i - 1].y;
            } else {
                xLast = this.path[i].x;
                yLast = this.path[i].y;
                ctx.moveTo(xLast, yLast);
            }

            const xMid = (this.path[i].x + xLast) / 2;
            const yMid = (this.path[i].y + yLast) / 2;
            ctx.quadraticCurveTo(xLast, yLast, xMid, yMid);
        }

        ctx.stroke();
    }
}

export default DrawingPath;
