import DrawingThread from '../DrawingThread';
import AnnotationService from '../../AnnotationService';
import {
    STATES,
    THREAD_EVENT
} from '../../annotationConstants'

let thread;
let stubs;
const sandbox = sinon.sandbox.create();

describe('lib/annotations/drawing/DrawingThread', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        stubs = {};
        thread = new DrawingThread({
            annotatedElement: document.querySelector('.annotated-element'),
            annotations: [],
            annotationService: new AnnotationService({
                apiHost: 'https://app.box.com/api',
                fileId: 1,
                token: 'someToken',
                canAnnotate: true,
                user: 'completelyRealUser',
            }),
            fileVersionId: 1,
            location: {},
            threadID: 2,
            type: 'draw'
        });
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        thread = null;
    });

    describe('destroy()', () => {
        beforeEach(() => {
            thread.state = STATES.pending;
        });

        it('should clean up drawings', () => {
            sandbox.stub(window, 'cancelAnimationFrame');
            sandbox.stub(thread, 'reset');
            sandbox.stub(thread, 'emit');

            thread.lastAnimationRequestId = 1;
            thread.drawingContext = {
                clearRect: sandbox.stub(),
                canvas: {
                    width: 100,
                    height: 100
                }
            };
            thread.destroy();

            expect(window.cancelAnimationFrame).to.be.calledWith(1);
            expect(thread.reset).to.be.called;
            expect(thread.emit).to.be.calledWith(THREAD_EVENT.threadCleanup);
        })
    });

    describe('reset()', () => {
        it('should clear the boundary', () => {
            sandbox.stub(thread, 'clearBoundary');
            thread.reset();
            expect(thread.clearBoundary).to.be.called;
        });
    })

    describe('deleteThread()', () => {
        it('should delete all attached annotations, clear the drawn rectangle, and call destroy', () => {
            sandbox.stub(thread, 'getBrowserRectangularBoundary').returns(['a', 'b', 'c', 'd']);
            sandbox.stub(thread, 'deleteAnnotationWithID');
            sandbox.stub(thread, 'clearBoundary');
            thread.concreteContext = {
                clearRect: sandbox.stub()
            };

            thread.pathContainer = {
                destroy: sandbox.stub()
            };

            thread.annotations = ['annotation'];


            thread.deleteThread();
            expect(thread.getBrowserRectangularBoundary).to.be.called;
            expect(thread.concreteContext.clearRect).to.be.called;
            expect(thread.clearBoundary).to.be.called;
            expect(thread.deleteAnnotationWithID).to.be.calledWith('annotation');
            expect(thread.pathContainer).to.equal(null);
        });
    });

    describe('setContextStyles()', () => {
        it('should set configurable context properties', () => {
            thread.drawingContext = {
                lineCap: 'not set',
                lineJoin: 'not set',
                strokeStyle: 'no color',
                lineWidth: 'no width'
            };

            const config = {
                scale: 2,
                color: 'blue'
            };

            thread.setContextStyles(config);

            assert.deepEqual(thread.drawingContext, {
                lineCap: 'round',
                lineJoin: 'round',
                strokeStyle: 'blue',
                lineWidth: thread.drawingContext.lineWidth
            });

            assert.ok(thread.drawingContext.lineWidth % config.scale == 0);
        })
    });

    describe('render()', () => {
        beforeEach(() => {
            sandbox.stub(thread, 'draw');
        });

        it('should draw the pending path when the context is not empty', () => {
            const timeStamp = 20000;
            thread.render(timeStamp);
            expect(thread.draw).to.be.called;
        });

        it('should do nothing when the timeElapsed is less than the refresh rate', () => {
            const timeStamp = 100;
            thread.lastRenderTimestamp = 100;
            thread.render(timeStamp);
            expect(thread.draw).to.not.be.called;
        });
    });

    describe('setup()', () => {
        beforeEach(() => {
            stubs.createDialog = sandbox.stub(thread, 'createDialog');
        });

        it('should set the state to be pending when there are no saved annotations', () => {
            thread.annotations = [];
            thread.setup();
            expect(thread.state).to.equal(STATES.pending);
            expect(stubs.createDialog).to.not.be.called;
        });

        it('should set the state to be inactive and create a dialog when there are saved annotations', () => {
            thread.annotations = ['not empty'];
            thread.setup();
            expect(thread.state).to.equal(STATES.inactive);
            expect(stubs.createDialog).to.be.called;
        });
    });

    describe('undo()', () => {
        beforeEach(() => {
            stubs.draw = sandbox.stub(thread, 'draw');
            stubs.updateBoundary = sandbox.stub(thread, 'updateBoundary');
            stubs.setBoundary = sandbox.stub(thread, 'setBoundary');
            stubs.drawBoundary = sandbox.stub(thread, 'drawBoundary');
            stubs.emitAvailableActions = sandbox.stub(thread, 'emitAvailableActions');
            stubs.containerUndo = sandbox.stub(thread.pathContainer, 'undo');
        });

        it('should do nothing when the path container fails to undo', () => {
            stubs.containerUndo.returns(false);
            thread.undo();
            expect(stubs.containerUndo).to.be.called;
            expect(stubs.draw).to.not.be.called;
            expect(stubs.emitAvailableActions).to.not.be.called;
            expect(stubs.updateBoundary).to.not.be.called;
            expect(stubs.setBoundary).to.not.be.called;
            expect(stubs.drawBoundary).to.not.be.called;
        });

        it('should draw when the path container indicates a successful undo', () => {
            stubs.containerUndo.returns(true);
            thread.undo();
            expect(stubs.containerUndo).to.be.called;
            expect(stubs.draw).to.be.called;
            expect(stubs.emitAvailableActions).to.be.called;
            expect(stubs.updateBoundary).to.be.called;
            expect(stubs.setBoundary).to.be.called;
            expect(stubs.drawBoundary).to.be.called;
        });
    });

    describe('redo()', () => {
        beforeEach(() => {
            stubs.draw = sandbox.stub(thread, 'draw');
            stubs.emitAvailableActions = sandbox.stub(thread, 'emitAvailableActions');
            stubs.containerRedo = sandbox.stub(thread.pathContainer, 'redo');
        });

        it('should do nothing when the path container fails to redo', () => {
            stubs.containerRedo.returns(false);
            thread.redo();
            expect(stubs.containerRedo).to.be.called;
            expect(stubs.draw).to.not.be.called;
            expect(stubs.emitAvailableActions).to.not.be.called;
        });

        it('should draw when the path container indicates a successful redo', () => {
            stubs.containerRedo.returns(true);
            thread.redo();
            expect(stubs.containerRedo).to.be.called;
            expect(stubs.draw).to.be.called;
            expect(stubs.emitAvailableActions).to.be.called;
        });
    });

    describe('draw()', () => {
        let context;

        beforeEach(() => {
            thread.pendingPath = {
                isEmpty: sandbox.stub(),
                drawPath: sandbox.stub()
            };
            stubs.applyToItems = sandbox.stub(thread.pathContainer, 'applyToItems');
            stubs.pendingEmpty = thread.pendingPath.isEmpty;
            stubs.pendingDraw = thread.pendingPath.drawPath;
            context = {
                clearRect: sandbox.stub(),
                beginPath: sandbox.stub(),
                stroke: sandbox.stub(),
                canvas: {
                    width: 1,
                    height: 2
                }
            };
        });

        it('should do nothing when context is null or undefined', () => {
            context = undefined;
            thread.draw(context);
            context = null;
            thread.draw(context);
            expect(stubs.applyToItems).to.not.be.called;
        });

        it('should draw the items in the path container when given a valid context', () => {
            stubs.pendingEmpty.returns(false);
            thread.draw(context);
            expect(context.beginPath).to.be.called;
            expect(stubs.applyToItems).to.be.called;
            expect(stubs.pendingEmpty).to.be.called;
            expect(stubs.pendingDraw).to.be.called;
            expect(context.stroke).to.be.called;
        });

        it('should clear the canvas when the flag is true', () => {
            thread.draw(context, true);
            expect(context.clearRect).to.be.called;
        });

        it('should not clear the canvas when the flag is true', () => {
            thread.draw(context, false);
            expect(context.clearRect).to.not.be.called;
        });
    });

    describe('emitAvailableActions()', () => {
        afterEach(() => {
            thread.removeAllListeners('threadevent');
        });

        it('should trigger an annotationevent with the number of available undo and redo actions', (done) => {
            const numItems = {
                undoCount: 3,
                redoCount: 2
            };
            sandbox.stub(thread.pathContainer, 'getNumberOfItems').returns(numItems);
            thread.addListener('threadevent', (data) => {
                const { eventData } = data;
                expect(data.event).to.equal('availableactions');
                expect(eventData.undo).to.equal(numItems.undoCount);
                expect(eventData.redo).to.equal(numItems.redoCount);
                done();
            });

            thread.emitAvailableActions();
        });
    });

    describe('drawBoundary()', () => {
        beforeEach(() => {
            stubs.getBrowserRectangularBoundary = sandbox.stub(thread, 'getBrowserRectangularBoundary');
        });

        it('should do nothing when the location has no page', () => {
            thread.location = {
                page: undefined
            };

            thread.drawBoundary();
            expect(stubs.getBrowserRectangularBoundary).to.not.be.called;
        });

        it('should draw the boundary of the saved path', () => {
            thread.drawingContext = {
                save: sandbox.stub(),
                beginPath: sandbox.stub(),
                setLineDash: sandbox.stub(),
                rect: sandbox.stub(),
                stroke: sandbox.stub(),
                restore: sandbox.stub()
            };
            stubs.getBrowserRectangularBoundary.returns([1,2,5,6]);
            thread.location = { page: 1 };

            thread.drawBoundary();
            expect(stubs.getBrowserRectangularBoundary).to.be.called;
            expect(thread.drawingContext.save).to.be.called;
            expect(thread.drawingContext.beginPath).to.be.called;
            expect(thread.drawingContext.setLineDash).to.be.called;
            expect(thread.drawingContext.rect).to.be.called;
            expect(thread.drawingContext.stroke).to.be.called;
            expect(thread.drawingContext.restore).to.be.called;
        })
    });

    describe('setBoundary()', () => {
        it('should do nothing when no drawingPaths have been saved', () => {
            thread.location = {};

            thread.setBoundary();
            expect(thread.minX).to.be.undefined;
            expect(thread.maxX).to.be.undefined;
            expect(thread.minY).to.be.undefined;
            expect(thread.maxY).to.be.undefined;
        });

        it('should set the boundary when the location has been assigned', () => {
            thread.location = {
                minX: 5,
                minY: 6,
                maxX: 7,
                maxY: 8
            };

            thread.setBoundary();
            expect(thread.minX).to.equal(thread.location.minX);
            expect(thread.maxX).to.equal(thread.location.maxX);
            expect(thread.minY).to.equal(thread.location.minY);
            expect(thread.maxY).to.equal(thread.location.maxY);
        });
    });

    describe('clearBoundary()', () => {
        it('should clear the drawing context and hide any dialog', () => {
            thread.drawingContext = {
                canvas: {
                    width: 100,
                    height: 100
                },
                clearRect: sandbox.stub()
            };

            thread.dialog = {
                isVisible: sandbox.stub().returns(true),
                hide: sandbox.stub(),
                destroy: () => {},
                removeAllListeners: () => {}
            };

            thread.clearBoundary();
            expect(thread.drawingContext.clearRect).to.be.called;
            expect(thread.dialog.isVisible).to.be.called;
            expect(thread.dialog.hide).to.be.called;
        });
    });
});
