import EventEmitter from 'events';

class DrawingContainer extends EventEmitter {
    /** @property {Array} - The item history stack for undo operations */
    undoStack = [];

    /** @property {Array} - The item history stack for redo operations*/
    redoStack = [];

    insert(item) {
        this.undoStack.push(item);
        this.redoStack = [];
        this.emit('redoempty');
    }

    undo() {
        if (this.undoStack.length === 0) {
            return;
        } else if (this.undoStack.length === 1) {
            this.emit('undoempty');
        }

        const latestDone = this.undoStack.pop();
        this.redoStack.push(latestDone);
    }

    redo() {
        if (this.redoStack.length === 0) {
            return;
        } else if (this.redoStack.length === 1) {
            this.emit('redoempty');
        }

        const latestRedone = this.redoStack.pop();
        this.undoStack.push(latestRedone);
    }

    getAll() {
        return this.undoStack.slice();
    }
}

export default DrawingContainer;
