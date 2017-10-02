import AnnotationModeController from '../../AnnotationModeController';
import DrawingModeController from '../DrawingModeController';
import * as annotatorUtil from '../../annotatorUtil';

let drawingModeController;
let stubs;
const sandbox = sinon.sandbox.create();

describe('lib/annotations/drawing/DrawingModeController', () => {
    beforeEach(() => {
        drawingModeController = new DrawingModeController();
        stubs = {};
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        stubs = null;
        drawingModeController = null;
    });

    describe('registerAnnotator()', () => {
        const annotator = {
            getAnnotateButton: sandbox.stub(),
            options: {
                header: 'none'
            }
        };
        it('should use the annotator to get button elements', () => {
            annotator.getAnnotateButton.onCall(0).returns('cancelButton');
            annotator.getAnnotateButton.onCall(1).returns('postButton');
            annotator.getAnnotateButton.onCall(2).returns('undoButton');
            annotator.getAnnotateButton.onCall(3).returns('redoButton');

            expect(drawingModeController.postButtonEl).to.be.undefined;
            expect(drawingModeController.undoButtonEl).to.be.undefined;
            expect(drawingModeController.redoButtonEl).to.be.undefined;

            drawingModeController.registerAnnotator(annotator);
            annotator.getAnnotateButton.onCall(0).returns('cancelButton');
            expect(drawingModeController.postButtonEl).to.equal('postButton');
            expect(drawingModeController.redoButtonEl).to.equal('redoButton');
            expect(drawingModeController.undoButtonEl).to.equal('undoButton');
        });

        it('should setup the drawing header if the options allow', () => {
            const setupHeaderStub = sandbox.stub(drawingModeController, 'setupHeader');

            drawingModeController.registerAnnotator(annotator);
            expect(setupHeaderStub).to.not.be.called;

            annotator.options.header = 'dark';

            drawingModeController.registerAnnotator(annotator);
            expect(setupHeaderStub).to.be.called;
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

            expect(drawingModeController.threads.search(thread)).to.deep.equal([]);

            drawingModeController.registerThread(thread);
            expect(drawingModeController.threads.search(thread).includes(thread)).to.be.truthy;
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

            drawingModeController.threads.insert(thread);
            expect(drawingModeController.threads.search(thread).includes(thread)).to.be.truthy;

            drawingModeController.unregisterThread(thread);
            expect(drawingModeController.threads.search(thread)).to.deep.equal([]);
        });
    });


    describe('bindCustomListenersOnThread()', () => {
        beforeEach(() => {
            Object.defineProperty(AnnotationModeController.prototype, 'bindCustomListenersOnThread', { value: sandbox.stub() })
            stubs.super = AnnotationModeController.prototype.bindCustomListenersOnThread;
        });

        it('should do nothing when the input is empty', () => {
            drawingModeController.bindCustomListenersOnThread(undefined);
            expect(stubs.super).to.not.be.called;
        });

        it('should bind custom listeners on thread', () => {
            const thread = {
                addListener: sandbox.stub()
            };

            drawingModeController.bindCustomListenersOnThread(thread);
            expect(stubs.super).to.be.called;
            expect(thread.addListener).to.be.calledWith('annotationsaved');
            expect(thread.addListener).to.be.calledWith('annotationdelete');
        });
    });

    describe('setupHandlers()', () => {
        beforeEach(() => {
            drawingModeController.annotator = {
                createAnnotationThread: sandbox.stub(),
                getLocationFromEvent: sandbox.stub(),
                annotatedElement: {}
            };
            stubs.createThread = drawingModeController.annotator.createAnnotationThread;
            stubs.getLocation = drawingModeController.annotator.getLocationFromEvent;
            stubs.bindCustomListenersOnThread = sandbox.stub(drawingModeController, 'bindCustomListenersOnThread');

            stubs.createThread.returns({
                saveAnnotation: () => {},
                undo: () => {},
                redo: () => {},
                handleMove: () => {},
                handleStart: () => {},
                handleStop: () => {}
            });
        });

        it('should successfully contain draw mode handlers if undo and redo buttons do not exist', () => {
            drawingModeController.postButtonEl = 'not undefined';
            drawingModeController.undoButtonEl = undefined;
            drawingModeController.redoButtonEl = undefined;

            drawingModeController.setupHandlers();
            expect(stubs.createThread).to.be.called;
            expect(stubs.bindCustomListenersOnThread).to.be.called;
            expect(drawingModeController.handlers.length).to.equal(4);
        });

        it('should successfully contain draw mode handlers if undo and redo buttons exist', () => {
            drawingModeController.postButtonEl = 'not undefined';
            drawingModeController.undoButtonEl = 'also not undefined';
            drawingModeController.redoButtonEl = 'additionally not undefined';
            drawingModeController.cancelButtonEl = 'definitely not undefined';


            drawingModeController.setupHandlers();
            expect(stubs.createThread).to.be.called;
            expect(stubs.bindCustomListenersOnThread).to.be.called;
            expect(drawingModeController.handlers.length).to.equal(7);
        });
    });

    describe('unbindModeListeners()', () => {
        it('should disable undo and redo buttons', () => {
            sandbox.stub(annotatorUtil, 'disableElement');

            drawingModeController.undoButtonEl = 'test1';
            drawingModeController.redoButtonEl = 'test2';
            drawingModeController.unbindModeListeners();
            expect(annotatorUtil.disableElement).to.be.calledWith(drawingModeController.undoButtonEl);
            expect(annotatorUtil.disableElement).to.be.calledWith(drawingModeController.redoButtonEl);
        });
    });

    describe('handleAnnotationEvent()', () => {
        it('should add thread to map on locationassigned', () => {
            const thread = 'obj';
            drawingModeController.annotator = {
                addThreadToMap: sandbox.stub()
            };

            drawingModeController.handleAnnotationEvent(thread, {
                event: 'locationassigned'
            });
            expect(drawingModeController.annotator.addThreadToMap).to.be.called;
        });

        it('should restart mode listeners from the thread on softcommit', () => {
            const thread = {
                saveAnnotation: sandbox.stub(),
                handleStart: sandbox.stub()
            };

            sandbox.stub(drawingModeController, 'unbindModeListeners');
            sandbox.stub(drawingModeController, 'bindModeListeners');
            drawingModeController.handleAnnotationEvent(thread, {
                event: 'softcommit'
            });
            expect(drawingModeController.unbindModeListeners).to.be.called;
            expect(drawingModeController.bindModeListeners).to.be.called;
            expect(thread.saveAnnotation).to.be.called;
            expect(thread.handleStart).to.not.be.called;
        });

        it('should start a new thread on pagechanged', () => {
            const thread1 = {
                saveAnnotation: sandbox.stub()
            };
            const thread2 = {
                handleStart: sandbox.stub()
            };
            const data = {
                event: 'softcommit',
                eventData: {
                    location: 'not empty'
                }
            };
            sandbox.stub(drawingModeController, 'unbindModeListeners');
            sandbox.stub(drawingModeController, 'bindModeListeners', () => {
                drawingModeController.currentThread = thread2;
            });

            drawingModeController.handleAnnotationEvent(thread1, data);
            expect(thread1.saveAnnotation).to.be.called;
            expect(drawingModeController.unbindModeListeners).to.be.called;
            expect(drawingModeController.bindModeListeners).to.be.called;
            expect(thread2.handleStart).to.be.calledWith(data.eventData.location);
        });

        it('should update undo and redo buttons on availableactions', () => {
            const thread = 'thread';
            sandbox.stub(drawingModeController, 'updateUndoRedoButtonEls');

            drawingModeController.handleAnnotationEvent(thread, {
                event: 'availableactions',
                eventData: {
                    undo: 1,
                    redo: 2
                }
            });
            expect(drawingModeController.updateUndoRedoButtonEls).to.be.calledWith(1, 2);
        });

        it('should soft delete a pending thread and restart mode listeners', () => {
            const thread = {
                state: 'pending',
                destroy: sandbox.stub()
            };

            sandbox.stub(drawingModeController, 'unbindModeListeners');
            sandbox.stub(drawingModeController, 'bindModeListeners');
            drawingModeController.handleAnnotationEvent(thread, {
                event: 'dialogdelete'
            });
            expect(thread.destroy).to.be.called;
            expect(drawingModeController.unbindModeListeners).to.be.called;
            expect(drawingModeController.bindModeListeners).to.be.called;
        });

        it('should delete a non-pending thread', () => {
            const thread = {
                state: 'idle',
                deleteThread: sandbox.stub()
            };
            drawingModeController.threads = {
                search: sandbox.stub().returns([])
            };

            const unregisterThreadStub = sandbox.stub(drawingModeController, 'unregisterThread');

            drawingModeController.handleAnnotationEvent(thread, {
                event: 'dialogdelete'
            });
            expect(thread.deleteThread).to.be.called;
            expect(unregisterThreadStub).to.be.called;
            expect(drawingModeController.threads.search).to.be.called;
        });
    });

    describe('handleSelection()', () => {
        beforeEach(() => {
            drawingModeController.annotator = {
                getLocationFromEvent: sandbox.stub()
            }
            stubs.getLoc = drawingModeController.annotator.getLocationFromEvent;
        });

        it('should do nothing with an empty event', () => {
            drawingModeController.handleSelection();
            expect(stubs.getLoc).to.not.be.called;
        })

        it('should call select on an thread found in the data store', () => {
            stubs.select = sandbox.stub(drawingModeController, 'select');
            stubs.clean = sandbox.stub(drawingModeController, 'removeSelection');
            stubs.getLoc.returns({
                x: 5,
                y: 5
            });

            const filteredObject = 'a';
            const filterObjects = {
                filter: sandbox.stub().returns([filteredObject])
            };
            drawingModeController.threads = {
                search: sandbox.stub().returns(filterObjects)
            };

            drawingModeController.handleSelection('event');
            expect(drawingModeController.threads.search).to.be.called;
            expect(filterObjects.filter).to.be.called;
            expect(stubs.clean).to.be.called;
            expect(stubs.select).to.be.calledWith(filteredObject);
        });
    });

    describe('removeSelection()', () => {
        it('should clean a selected thread boundary', () => {
            const thread = {
                clearBoundary: sandbox.stub()
            };
            drawingModeController.selectedThread = thread;

            drawingModeController.removeSelection();
            expect(thread.clearBoundary).to.be.called;
            expect(drawingModeController.selectedThread).to.be.undefined;
        });
    });

    describe('select()', () => {
        it('should draw the boundary', () => {
            const thread = {
                drawBoundary: sandbox.stub()
            }

            expect(drawingModeController.selectedThread).to.not.deep.equal(thread);
            drawingModeController.select(thread);
            expect(thread.drawBoundary).to.be.called;
            expect(drawingModeController.selectedThread).to.deep.equal(thread);
        });
    });

    describe('updateUndoRedoButtonEls()', () => {
        beforeEach(() => {
            drawingModeController.undoButtonEl = 'undo';
            drawingModeController.redoButtonEl = 'redo';
            stubs.enable = sandbox.stub(annotatorUtil, 'enableElement');
            stubs.disable = sandbox.stub(annotatorUtil, 'disableElement');
        });

        it('should disable both when the counts are 0', () => {
            drawingModeController.updateUndoRedoButtonEls(0, 0);
            expect(stubs.disable).be.calledWith(drawingModeController.undoButtonEl);
            expect(stubs.disable).be.calledWith(drawingModeController.redoButtonEl);
            expect(stubs.enable).to.not.be.called;
        });

        it('should enable both when the counts are 1', () => {
            drawingModeController.updateUndoRedoButtonEls(1, 1);
            expect(stubs.enable).be.calledWith(drawingModeController.undoButtonEl);
            expect(stubs.enable).be.calledWith(drawingModeController.redoButtonEl);
            expect(stubs.disable).to.not.be.called;
        });

        it('should enable undo and do nothing for redo', () => {
            drawingModeController.updateUndoRedoButtonEls(1, 2);
            expect(stubs.enable).be.calledWith(drawingModeController.undoButtonEl).once;
            expect(stubs.disable).to.not.be.called;
        });
    });
});
