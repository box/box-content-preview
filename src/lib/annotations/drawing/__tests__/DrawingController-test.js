import AnnotationController from '../../AnnotationController';
import DrawingController from '../DrawingController';
import * as annotatorUtil from '../../annotatorUtil';

let drawingController;
let stubs;
const sandbox = sinon.sandbox.create();

describe('lib/annotations/drawing/DrawingController', () => {
    beforeEach(() => {
        drawingController = new DrawingController();
        stubs = {};
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        stubs = null;
        drawingController = null;
    });

    describe('registerAnnotator()', () => {
        it('should use the annotator to get button elements', () => {
            const annotator = {
                getAnnotateButton: sandbox.stub()
            };
            annotator.getAnnotateButton.onCall(0).returns('postButton');
            annotator.getAnnotateButton.onCall(1).returns('undoButton');
            annotator.getAnnotateButton.onCall(2).returns('redoButton');

            expect(drawingController.postButtonEl).to.be.undefined;
            expect(drawingController.undoButtonEl).to.be.undefined;
            expect(drawingController.redoButtonEl).to.be.undefined;

            drawingController.registerAnnotator(annotator);
            expect(drawingController.postButtonEl).to.equal('postButton');
            expect(drawingController.redoButtonEl).to.equal('redoButton');
            expect(drawingController.undoButtonEl).to.equal('undoButton');
        });
    });

    describe('registerThread()', () => {
        it('should internally keep track of the registered thread', () => {
            const thread = {
                minX: 10,
                minY: 10,
                maxX: 20,
                maxY: 20,
                location: {
                    page: 1
                },
                info: 'I am a thread'
            }

            expect(drawingController.threads.search(thread)).to.deep.equal([]);

            drawingController.registerThread(thread);
            expect(drawingController.threads.search(thread).includes(thread)).to.be.truthy;
        });
    });

    describe('unregisterThread()', () => {
        it('should internally keep track of the registered thread', () => {
            const thread = {
                minX: 10,
                minY: 10,
                maxX: 20,
                maxY: 20,
                location: {
                    page: 1
                },
                info: 'I am a thread'
            }

            drawingController.threads.insert(thread);
            expect(drawingController.threads.search(thread).includes(thread)).to.be.truthy;

            drawingController.unregisterThread(thread);
            expect(drawingController.threads.search(thread)).to.deep.equal([]);
        });
    });


    describe('bindCustomListenersOnThread()', () => {
        beforeEach(() => {
            Object.defineProperty(AnnotationController.prototype, 'bindCustomListenersOnThread', { value: sandbox.stub() })
            stubs.super = AnnotationController.prototype.bindCustomListenersOnThread;
        });

        it('should do nothing when the input is empty', () => {
            drawingController.bindCustomListenersOnThread(undefined);
            expect(stubs.super).to.not.be.called;
        });

        it('should bind custom listeners on thread', () => {
            const thread = {
                addListener: sandbox.stub()
            };

            drawingController.bindCustomListenersOnThread(thread);
            expect(stubs.super).to.be.called;
            expect(thread.addListener).to.be.called.twice;
        });
    });

    describe('setupAndGetHandlers()', () => {
        beforeEach(() => {
            drawingController.annotator = {
                createAnnotationThread: sandbox.stub(),
                getLocationFromEvent: sandbox.stub(),
                annotatedElement: {}
            };
            stubs.createThread = drawingController.annotator.createAnnotationThread;
            stubs.getLocation = drawingController.annotator.getLocationFromEvent;
            stubs.bindCustomListenersOnThread = sandbox.stub(drawingController, 'bindCustomListenersOnThread');

            stubs.createThread.returns({
                saveAnnotation: () => {},
                undo: () => {},
                redo: () => {},
                handleMove: () => {},
                handleStart: () => {},
                handleStop: () => {}
            });
        });

        it('should successfully return draw mode handlers if undo and redo buttons do not exist', () => {
            drawingController.postButtonEl = 'not undefined';
            drawingController.undoButtonEl = undefined;
            drawingController.redoButtonEl = undefined;

            const handlers = drawingController.setupAndGetHandlers();
            expect(stubs.createThread).to.be.called;
            expect(stubs.bindCustomListenersOnThread).to.be.called;
            expect(handlers.length).to.equal(4);
        });

        it('should successfully return draw mode handlers if undo and redo buttons exist', () => {
            drawingController.postButtonEl = 'not undefined';
            drawingController.undoButtonEl = 'also not undefined';
            drawingController.redoButtonEl = 'additionally not undefined';

            const handlers = drawingController.setupAndGetHandlers();
            expect(stubs.createThread).to.be.called;
            expect(stubs.bindCustomListenersOnThread).to.be.called;
            expect(handlers.length).to.equal(6);
        });
    });

    describe('handleAnnotationEvent()', () => {
        it('should add thread to map on locationassigned', () => {
            const thread = 'obj';
            drawingController.annotator = {
                addThreadToMap: sandbox.stub()
            };

            drawingController.handleAnnotationEvent(thread, {
                type: 'locationassigned'
            });
            expect(drawingController.annotator.addThreadToMap).to.be.called;
        });

        it('should remove annotationevent listeners from the thread on drawcommit', () => {
            const thread = {
                removeAllListeners: sandbox.stub()
            };

            drawingController.handleAnnotationEvent(thread, {
                type: 'drawcommit'
            });
            expect(thread.removeAllListeners).to.be.calledWith('annotationevent');
        });

        it('should start a new thread on pagechanged', () => {
            const thread1 = {
                saveAnnotation: sandbox.stub()
            };
            const thread2 = {
                handleStart: sandbox.stub()
            };
            const data = {
                type: 'pagechanged',
                location: 'not empty'
            };
            sandbox.stub(drawingController, 'unbindModeListeners');
            sandbox.stub(drawingController, 'bindModeListeners', () => {
                drawingController.currentThread = thread2;
            });

            drawingController.handleAnnotationEvent(thread1, data);
            expect(thread1.saveAnnotation).to.be.called;
            expect(drawingController.unbindModeListeners).to.be.called;
            expect(drawingController.bindModeListeners).to.be.called;
            expect(thread2.handleStart).to.be.calledWith(data.location);
        });

        it('should update undo and redo buttons on availableactions', () => {
            const thread = 'thread';
            sandbox.stub(drawingController, 'updateUndoRedoButtonEls');

            drawingController.handleAnnotationEvent(thread, {
                type: 'availableactions',
                undo: 1,
                redo: 2
            });
            expect(drawingController.updateUndoRedoButtonEls).to.be.calledWith(1, 2);
        });
    });

    describe('handleSelection()', () => {
        beforeEach(() => {
            drawingController.annotator = {
                getLocationFromEvent: sandbox.stub()
            }
            stubs.getLoc = drawingController.annotator.getLocationFromEvent;
        });

        it('should do nothing with an empty event', () => {
            drawingController.handleSelection();
            expect(stubs.getLoc).to.not.be.called;
        })

        it('should call select on an thread found in the data store', () => {
            stubs.select = sandbox.stub(drawingController, 'select');
            stubs.getLoc.returns({
                x: 5,
                y: 5
            });

            const filteredObject = 'a';
            const filterObjects = {
                filter: sandbox.stub().returns([filteredObject])
            };
            drawingController.threads = {
                search: sandbox.stub().returns(filterObjects)
            };

            drawingController.handleSelection('event');
            expect(drawingController.threads.search).to.be.called;
            expect(filterObjects.filter).to.be.called;
            expect(stubs.select).to.be.calledWith(filteredObject);
        });
    });

    describe('select()', () => {
        it('should draw the boundary', () => {
            const thread = {
                drawBoundary: sandbox.stub()
            }

            expect(drawingController.selected).to.not.deep.equal(thread);
            drawingController.select(thread);
            expect(thread.drawBoundary).to.be.called;
            expect(drawingController.selected).to.deep.equal(thread);
        });
    });

    describe('updateUndoRedoButtonEls()', () => {
        beforeEach(() => {
            drawingController.undoButtonEl = 'undo';
            drawingController.redoButtonEl = 'redo';
            stubs.enable = sandbox.stub(annotatorUtil, 'enableElement');
            stubs.disable = sandbox.stub(annotatorUtil, 'disableElement');
        });

        it('should disable both when the counts are 0', () => {
            drawingController.updateUndoRedoButtonEls(0, 0);
            expect(stubs.disable).be.calledWith(drawingController.undoButtonEl);
            expect(stubs.disable).be.calledWith(drawingController.redoButtonEl);
            expect(stubs.enable).to.not.be.called;
        });

        it('should enable both when the counts are 1', () => {
            drawingController.updateUndoRedoButtonEls(1, 1);
            expect(stubs.enable).be.calledWith(drawingController.undoButtonEl);
            expect(stubs.enable).be.calledWith(drawingController.redoButtonEl);
            expect(stubs.disable).to.not.be.called;
        });

        it('should enable undo and do nothing for redo', () => {
            drawingController.updateUndoRedoButtonEls(1, 2);
            expect(stubs.enable).be.calledWith(drawingController.undoButtonEl).once;
            expect(stubs.disable).to.not.be.called;
        });
    });
});
