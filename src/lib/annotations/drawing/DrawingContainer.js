class DrawingContainer {
    //--------------------------------------------------------------------------
    // Typedef
    //--------------------------------------------------------------------------

    /**
     * @typedef {Object} AvailableItemData
     * @property {number} undo Number of undoable items
     * @property {number} redo Number of redoable items
     */

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /** @property {Array} - The item history stack for undo operations */
    undoStack = [];

    /** @property {Array} - The item history stack for redo operations */
    redoStack = [];

    /**
     * Insert an item into the drawing container. Clears any redoable items.
     *
     * @param {Object} item - An object to be contained in the data structure.
     * @return {void}
     */
    insert(item) {
        this.undoStack.push(item);
        this.redoStack = [];
    }

    /**
     * Move an item from the undo stack into the redo stack if an item exists.
     *
     * @return {boolean} Whether or not an undo was done.
     */
    undo() {
        if (this.isEmpty()) {
            return false;
        }

        const latestUndone = this.undoStack.pop();
        this.redoStack.push(latestUndone);
        return true;
    }

    /**
     * Move an item from the redo stack into the undo stack if an item exists.
     *
     * @return {boolean} Whether or not a redo was done.
     */
    redo() {
        if (this.redoStack.length === 0) {
            return false;
        }

        const latestRedone = this.redoStack.pop();
        this.undoStack.push(latestRedone);
        return true;
    }

    /**
     * Return whether or not there are objects that can be undone
     *
     * @return {boolean} Whether or not there exists committed items
     */
    isEmpty() {
        return this.undoStack.length === 0;
    }

    /**
     * Retrieve a JSON blob containing the number of undo and redo in each stack.
     *
     * @return {AvailableItemData} The number of undo and redo items available.
     */
    getNumberOfItems() {
        return {
            undoCount: this.undoStack.length,
            redoCount: this.redoStack.length
        };
    }

    /**
     * Retrieve the visible items on the undo stack.
     *
     * @return {Array} A copy of the undoStack as an array.
     */
    getItems() {
        return this.undoStack.slice();
    }

    /**
     * Get the axis-aligned bounding box for all of the drawing items in the container
     *
     * @return {Object} The object with the boundaries and the path
     */
    getAxisAlignedBoundingBox() {
        const items = this.getItems();
        const boundary = {
            minX: Infinity,
            maxX: -Infinity,
            minY: Infinity,
            maxY: -Infinity,
            paths: []
        };

        items.forEach((drawingPath) => {
            boundary.minX = Math.min(boundary.minX, drawingPath.minX);
            boundary.maxX = Math.max(boundary.maxX, drawingPath.maxX);
            boundary.minY = Math.min(boundary.minY, drawingPath.minY);
            boundary.maxY = Math.max(boundary.maxY, drawingPath.maxY);
            boundary.paths.push({
                path: drawingPath.path
            });
        });
        return boundary;
    }

    /**
     * Apply a function to the items in the container.
     *
     * @param {Function} fn - The function to apply to the items.
     * @param {boolean} [includeHiddenItems] - Whether or not to apply the function to items hidden on the redo stack.
     * @return {void}
     */
    applyToItems(fn, includeHiddenItems = false) {
        this.undoStack.forEach(fn);

        if (includeHiddenItems) {
            this.redoStack.forEach(fn);
        }
    }
}

export default DrawingContainer;
