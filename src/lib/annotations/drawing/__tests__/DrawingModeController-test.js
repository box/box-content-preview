import rbush from 'rbush';
import AnnotationModeController from '../../AnnotationModeController';
import DrawingModeController from '../DrawingModeController';
import * as annotatorUtil from '../../annotatorUtil';
import { CLASS_ANNOTATION_DRAW} from '../../annotationConstants';

let controller;
let stubs;
const sandbox = sinon.sandbox.create();

describe('lib/annotations/drawing/DrawingModeController', () => {
    beforeEach(() => {
        controller = new DrawingModeController();
        stubs = {};
        stubs.thread = {
            minX: 10,
            minY: 10,
            maxX: 20,
            maxY: 20,
            location: {
                page: 1
            },
            info: 'I am a thread',
            addListener: sandbox.stub(),
            saveAnnotation: sandbox.stub(),
            handleStart: sandbox.stub(),
            destroy: sandbox.stub(),
            deleteThread: sandbox.stub(),
            show: sandbox.stub()
        };
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        stubs = null;
        controller = null;
    });

    describe('registerAnnotator()', () => {
        const annotator = {
            getAnnotateButton: sandbox.stub(),
            options: {
                header: 'none'
            },
            annotatedElement: {
                classList: {
                    add: sandbox.stub()
                }
            }
        };
        it('should use the annotator to get button elements', () => {
            annotator.getAnnotateButton.onCall(0).returns('cancelButton');
            annotator.getAnnotateButton.onCall(1).returns('postButton');
            annotator.getAnnotateButton.onCall(2).returns('undoButton');
            annotator.getAnnotateButton.onCall(3).returns('redoButton');

            expect(controller.postButtonEl).to.be.undefined;
            expect(controller.undoButtonEl).to.be.undefined;
            expect(controller.redoButtonEl).to.be.undefined;

            controller.registerAnnotator(annotator);
            annotator.getAnnotateButton.onCall(0).returns('cancelButton');
            expect(controller.postButtonEl).to.equal('postButton');
            expect(controller.redoButtonEl).to.equal('redoButton');
            expect(controller.undoButtonEl).to.equal('undoButton');
        });

        it('should setup the drawing header if the options allow', () => {
            const setupHeaderStub = sandbox.stub(controller, 'setupHeader');

            controller.registerAnnotator(annotator);
            expect(setupHeaderStub).to.not.be.called;

            annotator.options.header = 'dark';

            controller.registerAnnotator(annotator);
            expect(setupHeaderStub).to.be.called;
        });

        it('should add the draw class to the annotated element', () => {
            annotator.options.header = 'none';
            drawingModeController.registerAnnotator(annotator);
            expect(annotator.annotatedElement.classList.add).to.be.calledWith(CLASS_ANNOTATION_DRAW);
        });
    });

    describe('registerThread()', () => {
        it('should internally keep track of the registered thread', () => {
            controller.threads = { 1: new rbush() };
            const pageThreads = controller.threads[1];
            expect(pageThreads.search(stubs.thread)).to.deep.equal([]);

            controller.registerThread(stubs.thread);
            const thread = pageThreads.search(stubs.thread);
            expect(thread.includes(stubs.thread)).to.be.truthy;
        });
    });

    describe('unregisterThread()', () => {
        it('should internally keep track of the registered thread', () => {
            controller.threads = { 1: new rbush() };
            const pageThreads = controller.threads[1];

            controller.registerThread(stubs.thread);
            expect(pageThreads.search(stubs.thread).includes(stubs.thread)).to.be.truthy;

            controller.unregisterThread(stubs.thread);
            expect(pageThreads.search(stubs.thread)).to.deep.equal([]);
        });
    });


    describe('bindCustomListenersOnThread()', () => {
        beforeEach(() => {
            Object.defineProperty(AnnotationModeController.prototype, 'bindCustomListenersOnThread', { value: sandbox.stub() })
            stubs.super = AnnotationModeController.prototype.bindCustomListenersOnThread;
        });

        it('should do nothing when the input is empty', () => {
            controller.bindCustomListenersOnThread(undefined);
            expect(stubs.super).to.not.be.called;
        });

        it('should bind custom listeners on thread', () => {
            controller.bindCustomListenersOnThread(stubs.thread);
            expect(stubs.super).to.be.called;
            expect(stubs.thread.addListener).to.be.calledWith('annotationsaved');
            expect(stubs.thread.addListener).to.be.calledWith('annotationdelete');
        });
    });

    describe('setupHandlers()', () => {
        beforeEach(() => {
            controller.annotator = {
                createAnnotationThread: sandbox.stub(),
                getLocationFromEvent: sandbox.stub(),
                annotatedElement: {}
            };
            stubs.createThread = controller.annotator.createAnnotationThread;
            stubs.getLocation = controller.annotator.getLocationFromEvent;
            stubs.bindCustomListenersOnThread = sandbox.stub(controller, 'bindCustomListenersOnThread');

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
            controller.postButtonEl = 'not undefined';
            controller.undoButtonEl = undefined;
            controller.redoButtonEl = undefined;

            controller.setupHandlers();
            expect(stubs.createThread).to.be.called;
            expect(stubs.bindCustomListenersOnThread).to.be.called;
            expect(controller.handlers.length).to.equal(4);
        });

        it('should successfully contain draw mode handlers if undo and redo buttons exist', () => {
            controller.postButtonEl = 'not undefined';
            controller.undoButtonEl = 'also not undefined';
            controller.redoButtonEl = 'additionally not undefined';
            controller.cancelButtonEl = 'definitely not undefined';


            controller.setupHandlers();
            expect(stubs.createThread).to.be.called;
            expect(stubs.bindCustomListenersOnThread).to.be.called;
            expect(controller.handlers.length).to.equal(7);
        });
    });

    describe('unbindModeListeners()', () => {
        it('should disable undo and redo buttons', () => {
            sandbox.stub(annotatorUtil, 'disableElement');

            controller.undoButtonEl = 'test1';
            controller.redoButtonEl = 'test2';
            controller.unbindModeListeners();
            expect(annotatorUtil.disableElement).to.be.calledWith(controller.undoButtonEl);
            expect(annotatorUtil.disableElement).to.be.calledWith(controller.redoButtonEl);
        });
    });

    describe('handleAnnotationEvent()', () => {
        it('should add thread to map on locationassigned', () => {
            controller.annotator = {
                addThreadToMap: sandbox.stub()
            };

            controller.handleAnnotationEvent(stubs.thread, {
                event: 'locationassigned'
            });
            expect(controller.annotator.addThreadToMap).to.be.called;
        });

        it('should restart mode listeners from the thread on softcommit', () => {
            sandbox.stub(controller, 'unbindModeListeners');
            sandbox.stub(controller, 'bindModeListeners');
            controller.handleAnnotationEvent(stubs.thread, {
                event: 'softcommit'
            });
            expect(controller.unbindModeListeners).to.be.called;
            expect(controller.bindModeListeners).to.be.called;
            expect(stubs.thread.saveAnnotation).to.be.called;
            expect(stubs.thread.handleStart).to.not.be.called;
        });

        it('should start a new thread on pagechanged', () => {
            const thread1 = {
                minX: 10,
                minY: 10,
                maxX: 20,
                maxY: 20,
                location: {
                    page: 1
                },
                info: 'I am a thread',
                saveAnnotation: sandbox.stub()
            };
            const thread2 = {
                minX: 10,
                minY: 10,
                maxX: 20,
                maxY: 20,
                location: {
                    page: 1
                },
                info: 'I am a thread',
                handleStart: sandbox.stub()
            };
            const data = {
                event: 'softcommit',
                eventData: {
                    location: 'not empty'
                }
            };
            sandbox.stub(controller, 'unbindModeListeners');
            sandbox.stub(controller, 'bindModeListeners', () => {
                controller.currentThread = thread2;
            });

            controller.handleAnnotationEvent(thread1, data);
            expect(thread1.saveAnnotation).to.be.called;
            expect(controller.unbindModeListeners).to.be.called;
            expect(controller.bindModeListeners).to.be.called;
            expect(thread2.handleStart).to.be.calledWith(data.eventData.location);
        });

        it('should update undo and redo buttons on availableactions', () => {
            sandbox.stub(controller, 'updateUndoRedoButtonEls');

            controller.handleAnnotationEvent(stubs.thread, {
                event: 'availableactions',
                eventData: {
                    undo: 1,
                    redo: 2
                }
            });
            expect(controller.updateUndoRedoButtonEls).to.be.calledWith(1, 2);
        });

        it('should soft delete a pending thread and restart mode listeners', () => {
            stubs.thread.state = 'pending';

            sandbox.stub(controller, 'unbindModeListeners');
            sandbox.stub(controller, 'bindModeListeners');
            controller.handleAnnotationEvent(stubs.thread, {
                event: 'dialogdelete'
            });
            expect(stubs.thread.destroy).to.be.called;
            expect(controller.unbindModeListeners).to.be.called;
            expect(controller.bindModeListeners).to.be.called;
        });

        it('should delete a non-pending thread', () => {
            stubs.thread.state = 'idle';
            controller.threads[1] = new rbush();
            controller.registerThread(stubs.thread);
            const unregisterThreadStub = sandbox.stub(controller, 'unregisterThread');

            controller.handleAnnotationEvent(stubs.thread, {
                event: 'dialogdelete'
            });
            expect(stubs.thread.deleteThread).to.be.called;
            expect(unregisterThreadStub).to.be.called;
        });
    });

    describe('handleSelection()', () => {
        beforeEach(() => {
            controller.threads[1] = new rbush();
            controller.registerThread(stubs.thread);
            controller.annotator = {
                getLocationFromEvent: sandbox.stub().returns({ page: 1 })
            }
            stubs.getLoc = controller.annotator.getLocationFromEvent;
        });

        it('should do nothing with an empty event', () => {
            controller.handleSelection();
            expect(stubs.getLoc).to.not.be.called;
        })

        it('should call select on an thread found in the data store', () => {
            stubs.select = sandbox.stub(controller, 'select');
            stubs.clean = sandbox.stub(controller, 'removeSelection');
            stubs.getLoc.returns({
                x: 15,
                y: 15,
                page: 1
            });

            controller.handleSelection('event');
            expect(stubs.clean).to.be.called;
            expect(stubs.select).to.be.calledWith(stubs.thread);
        });
    });

    describe('removeSelection()', () => {
        it('should clean a selected thread boundary', () => {
            const thread = {
                clearBoundary: sandbox.stub()
            };
            controller.selectedThread = thread;

            controller.removeSelection();
            expect(thread.clearBoundary).to.be.called;
            expect(controller.selectedThread).to.be.undefined;
        });
    });

    describe('select()', () => {
        it('should draw the boundary', () => {
            const thread = {
                drawBoundary: sandbox.stub()
            }

            expect(controller.selectedThread).to.not.deep.equal(thread);
            controller.select(thread);
            expect(thread.drawBoundary).to.be.called;
            expect(controller.selectedThread).to.deep.equal(thread);
        });
    });

    describe('updateUndoRedoButtonEls()', () => {
        beforeEach(() => {
            controller.undoButtonEl = 'undo';
            controller.redoButtonEl = 'redo';
            stubs.enable = sandbox.stub(annotatorUtil, 'enableElement');
            stubs.disable = sandbox.stub(annotatorUtil, 'disableElement');
        });

        it('should disable both when the counts are 0', () => {
            controller.updateUndoRedoButtonEls(0, 0);
            expect(stubs.disable).be.calledWith(controller.undoButtonEl);
            expect(stubs.disable).be.calledWith(controller.redoButtonEl);
            expect(stubs.enable).to.not.be.called;
        });

        it('should enable both when the counts are 1', () => {
            controller.updateUndoRedoButtonEls(1, 1);
            expect(stubs.enable).be.calledWith(controller.undoButtonEl);
            expect(stubs.enable).be.calledWith(controller.redoButtonEl);
            expect(stubs.disable).to.not.be.called;
        });

        it('should enable undo and do nothing for redo', () => {
            controller.updateUndoRedoButtonEls(1, 2);
            expect(stubs.enable).be.calledWith(controller.undoButtonEl).once;
            expect(stubs.disable).to.not.be.called;
        });
    });
});
