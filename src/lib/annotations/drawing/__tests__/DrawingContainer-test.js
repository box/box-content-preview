import DrawingContainer from '../DrawingContainer';

let drawingContainer;
const sandbox = sinon.sandbox.create();

describe('lib/annotations/drawing/DrawingContainer', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        drawingContainer = new DrawingContainer();
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        drawingContainer = null;
    });

    describe('insert()', () => {
        it('should insert an item into the undoStack and clear the redo stack', () => {
            drawingContainer.redoStack = [1,2,3];
            expect(drawingContainer.undoStack.length).to.equal(0);
            drawingContainer.insert(4);
            expect(drawingContainer.undoStack.length).to.equal(1);
            expect(drawingContainer.redoStack.length).to.equal(0);
        });
    });

    describe('undo()', () => {
        it('should not undo when the undo stack is empty', () => {
            expect(drawingContainer.undoStack.length).to.equal(0);
            const val = drawingContainer.undo();
            expect(val).to.be.falsy;
        });

        it('should move an item from the top of the undo stack to the top of the redo stack', () => {
            drawingContainer.undoStack = [1,2,3];
            drawingContainer.redoStack = [4,5,6];
            const lengthBefore = drawingContainer.undoStack.length;
            const topUndo = drawingContainer.undoStack[lengthBefore - 1];
            const val = drawingContainer.undo();

            expect(val).to.be.truthy;
            expect(drawingContainer.undoStack.length).to.equal(lengthBefore - 1);
            expect(drawingContainer.redoStack.length).to.equal(lengthBefore + 1);
            expect(drawingContainer.redoStack[lengthBefore]).to.equal(topUndo);
        });
    });

    describe('redo()', () => {
        it('should not redo when the redo stack is empty', () => {
            expect(drawingContainer.redoStack.length).to.equal(0);
            const val = drawingContainer.redo();
            expect(val).to.be.falsy;
        });

        it('should move an item from the top of the redo stack to the top of the undo stack', () => {
            drawingContainer.undoStack = [1,2,3];
            drawingContainer.redoStack = [4,5,6];
            const lengthBefore = drawingContainer.redoStack.length;
            const topRedo = drawingContainer.redoStack[lengthBefore - 1];
            const val = drawingContainer.redo();

            expect(val).to.be.truthy;
            expect(drawingContainer.redoStack.length).to.equal(lengthBefore - 1);
            expect(drawingContainer.undoStack.length).to.equal(lengthBefore + 1);
            expect(drawingContainer.undoStack[lengthBefore]).to.equal(topRedo);
        });
    });

    describe('getNumberOfItems()', () => {
        it('should return the number of items on the undo stack and redo stack', () => {
            drawingContainer.undoStack = [1,2,3,4];
            drawingContainer.redoStack = [1,2];
            const val = drawingContainer.getNumberOfItems();

            expect(val.undoCount).to.equal(drawingContainer.undoStack.length);
            expect(val.redoCount).to.equal(drawingContainer.redoStack.length);
        });
    });

    describe('getItems()', () => {
        it('should get the items on the undoStack', () => {
            drawingContainer.undoStack = [1,2,3,4];
            drawingContainer.redoStack = [1,2];
            const val = drawingContainer.getItems();

            expect(val).to.not.deep.equal(drawingContainer.redoStack);
            expect(val).to.not.equal(drawingContainer.undoStack);
            expect(val).to.deep.equal(drawingContainer.undoStack);
        });
    });

    describe('applyToItems()', () => {
        it('should apply the function only to items on the undo stack', () => {
            const counter = {
                count: 0
            };
            drawingContainer.undoStack = [counter, counter, counter, counter];
            drawingContainer.redoStack = [counter];
            drawingContainer.applyToItems((item) => item.count = item.count + 1);

            expect(counter.count).to.equal(drawingContainer.undoStack.length);
        });

        it('should apply the function to items on the undo and redo stack', () => {
            const counter = {
                count: 0
            };
            drawingContainer.undoStack = [counter, counter, counter, counter];
            drawingContainer.redoStack = [counter, counter];
            drawingContainer.applyToItems((item) => item.count = item.count + 1, true);

            expect(counter.count).to.equal(drawingContainer.undoStack.length + drawingContainer.redoStack.length);
        });
    });

    describe('getAxisAlignedBoundingBox()', () => {
        let getItems;
        beforeEach(() => {
            getItems = sandbox.stub(drawingContainer, 'getItems');
        });

        it('should return a boundary of infinity when no items are stored', () => {
            getItems.returns([]);

            const returnValue = drawingContainer.getAxisAlignedBoundingBox();
            expect(getItems).to.be.called;
            expect(returnValue).to.deep.equal({
                minX: Infinity,
                maxX: -Infinity,
                minY: Infinity,
                maxY: -Infinity,
                paths: []
            });
        });

        it('should get the correct boundary based on the items contained', () => {
            const path1 = {
                minX: 5,
                minY: 6,
                maxX: 8,
                maxY: 9,
                path: [1,2,3,4]
            };
            const path2 = {
                minX: 3,
                minY: 7,
                maxX: 14,
                maxY: 8,
                path: [1,2,3]
            };
            getItems.returns([path1, path2]);

            const returnValue = drawingContainer.getAxisAlignedBoundingBox();
            expect(getItems).to.be.called;
            expect(returnValue).to.deep.equal({
                minX: path2.minX,
                maxX: path2.maxX,
                minY: path1.minY,
                maxY: path1.maxY,
                paths: [
                    { path: path1.path },
                    { path: path2.path }
                ]
            });
        });
    });

    describe('isEmpty()', () => {
        it('should return true when no items are in the undoStack', () => {
            drawingContainer.undoStack = [];
            expect(drawingContainer.isEmpty()).to.be.truthy;
        });

        it('should return false when there are items are in the undoStack', () => {
            drawingContainer.undoStack = ['one'];
            expect(drawingContainer.isEmpty()).to.be.falsy;
        });
    });
});
