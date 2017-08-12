class DrawingContainer {
    /** @property {Array} - The item history stack for undo operations */
    undoStack = [];

    /** @property {Array} - The item history stack for redo operations */
    redoStack = [];

    constructor() {
        this.undo = this.undo.bind(this);
        this.redo = this.redo.bind(this);
    }

    insert(item) {
        this.undoStack.push(item);
        this.redoStack = [];
    }

    undo() {
        if (this.undoStack.length === 0) {
            return false;
        }

        const latestDone = this.undoStack.pop();
        this.redoStack.push(latestDone);
        return true;
    }

    redo() {
        if (this.redoStack.length === 0) {
            return false;
        }

        const latestRedone = this.redoStack.pop();
        this.undoStack.push(latestRedone);
        return true;
    }

    getNumberOfItems() {
        return {
            undo: this.undoStack.length,
            redo: this.redoStack.length
        };
    }

    getItems() {
        return this.undoStack.slice();
    }

    mapAll(fn) {
        const items = this.undoStack.concat(this.redoStack);
        items.map(fn);
    }

    mapVisibleItems(fn) {
        this.undoStack.map(fn);
    }
}

export default DrawingContainer;
