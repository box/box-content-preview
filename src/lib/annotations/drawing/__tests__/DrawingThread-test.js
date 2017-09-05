import DrawingThread from '../DrawingThread';
import AnnotationService from '../../AnnotationService';
import {
    STATES
} from '../../annotationConstants'

let drawingThread;
let stubs;
const sandbox = sinon.sandbox.create();

describe('lib/annotations/drawing/DrawingThread', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        stubs = {};
        drawingThread = new DrawingThread({
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
        drawingThread = null;
    });

    describe('destroy()', () => {
        beforeEach(() => {
            drawingThread.state = STATES.pending;
        });

        it('should clean up drawings', () => {
            sandbox.stub(window, 'cancelAnimationFrame');
            sandbox.stub(drawingThread, 'reset');

            drawingThread.lastAnimationRequestId = 1;
            drawingThread.drawingContext = {
                clearRect: sandbox.stub(),
                canvas: {
                    width: 100,
                    height: 100
                }
            };
            drawingThread.destroy();

            expect(window.cancelAnimationFrame).to.be.calledWith(1);
            expect(drawingThread.reset).to.be.called;
        })
    });

    describe('reset()', () => {
        it('should clear the boundary', () => {
            sandbox.stub(drawingThread, 'clearBoundary');
            drawingThread.reset();
            expect(drawingThread.clearBoundary).to.be.called;
        });
    })

    describe('deleteThread()', () => {
        it('should delete all attached annotations, clear the drawn rectangle, and call destroy', () => {
            sandbox.stub(drawingThread, 'getBrowserRectangularBoundary').returns(['a', 'b', 'c', 'd']);
            sandbox.stub(drawingThread, 'deleteAnnotationWithID');
            sandbox.stub(drawingThread, 'clearBoundary');
            drawingThread.concreteContext = {
                clearRect: sandbox.stub()
            };
            drawingThread.annotations = ['annotation'];


            drawingThread.deleteThread();
            expect(drawingThread.getBrowserRectangularBoundary).to.be.called;
            expect(drawingThread.concreteContext.clearRect).to.be.called;
            expect(drawingThread.clearBoundary).to.be.called;
            expect(drawingThread.deleteAnnotationWithID).to.be.calledWith('annotation');
        });
    });

    describe('setContextStyles()', () => {
        it('should set configurable context properties', () => {
            drawingThread.drawingContext = {
                lineCap: 'not set',
                lineJoin: 'not set',
                strokeStyle: 'no color',
                lineWidth: 'no width'
            };

            const config = {
                scale: 2,
                color: 'blue'
            };

            drawingThread.setContextStyles(config);

            assert.deepEqual(drawingThread.drawingContext, {
                lineCap: 'round',
                lineJoin: 'round',
                strokeStyle: 'blue',
                lineWidth: drawingThread.drawingContext.lineWidth
            });

            assert.ok(drawingThread.drawingContext.lineWidth % config.scale == 0);
        })
    });

    describe('render()', () => {
        beforeEach(() => {
            sandbox.stub(drawingThread, 'draw');
        });

        it('should draw the pending path when the context is not empty', () => {
            const timeStamp = 20000;
            drawingThread.render(timeStamp);
            expect(drawingThread.draw).to.be.called;
        });

        it('should do nothing when the timeElapsed is less than the refresh rate', () => {
            const timeStamp = 100;
            drawingThread.lastRenderTimestamp = 100;
            drawingThread.render(timeStamp);
            expect(drawingThread.draw).to.not.be.called;
        });
    });

    describe('setup()', () => {
        beforeEach(() => {
            stubs.createDialog = sandbox.stub(drawingThread, 'createDialog');
        });

        it('should set the state to be pending when there are no saved annotations', () => {
            drawingThread.annotations = [];
            drawingThread.setup();
            expect(drawingThread.state).to.equal(STATES.pending);
            expect(stubs.createDialog).to.not.be.called;
        });

        it('should set the state to be inactive and create a dialog when there are saved annotations', () => {
            drawingThread.annotations = ['not empty'];
            drawingThread.setup();
            expect(drawingThread.state).to.equal(STATES.inactive);
            expect(stubs.createDialog).to.be.called;
        });
    });

    describe('undo()', () => {
        beforeEach(() => {
            stubs.draw = sandbox.stub(drawingThread, 'draw');
            stubs.updateBoundary = sandbox.stub(drawingThread, 'updateBoundary');
            stubs.setBoundary = sandbox.stub(drawingThread, 'setBoundary');
            stubs.drawBoundary = sandbox.stub(drawingThread, 'drawBoundary');
            stubs.emitAvailableActions = sandbox.stub(drawingThread, 'emitAvailableActions');
            stubs.containerUndo = sandbox.stub(drawingThread.pathContainer, 'undo');
        });

        it('should do nothing when the path container fails to undo', () => {
            stubs.containerUndo.returns(false);
            drawingThread.undo();
            expect(stubs.containerUndo).to.be.called;
            expect(stubs.draw).to.not.be.called;
            expect(stubs.emitAvailableActions).to.not.be.called;
            expect(stubs.updateBoundary).to.not.be.called;
            expect(stubs.setBoundary).to.not.be.called;
            expect(stubs.drawBoundary).to.not.be.called;
        });

        it('should draw when the path container indicates a successful undo', () => {
            stubs.containerUndo.returns(true);
            drawingThread.undo();
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
            stubs.draw = sandbox.stub(drawingThread, 'draw');
            stubs.emitAvailableActions = sandbox.stub(drawingThread, 'emitAvailableActions');
            stubs.containerRedo = sandbox.stub(drawingThread.pathContainer, 'redo');
        });

        it('should do nothing when the path container fails to redo', () => {
            stubs.containerRedo.returns(false);
            drawingThread.redo();
            expect(stubs.containerRedo).to.be.called;
            expect(stubs.draw).to.not.be.called;
            expect(stubs.emitAvailableActions).to.not.be.called;
        });

        it('should draw when the path container indicates a successful redo', () => {
            stubs.containerRedo.returns(true);
            drawingThread.redo();
            expect(stubs.containerRedo).to.be.called;
            expect(stubs.draw).to.be.called;
            expect(stubs.emitAvailableActions).to.be.called;
        });
    });

    describe('draw()', () => {
        let context;

        beforeEach(() => {
            drawingThread.pendingPath = {
                isEmpty: sandbox.stub(),
                drawPath: sandbox.stub()
            };
            stubs.applyToItems = sandbox.stub(drawingThread.pathContainer, 'applyToItems');
            stubs.pendingEmpty = drawingThread.pendingPath.isEmpty;
            stubs.pendingDraw = drawingThread.pendingPath.drawPath;
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
            drawingThread.draw(context);
            context = null;
            drawingThread.draw(context);
            expect(stubs.applyToItems).to.not.be.called;
        });

        it('should draw the items in the path container when given a valid context', () => {
            stubs.pendingEmpty.returns(false);
            drawingThread.draw(context);
            expect(context.beginPath).to.be.called;
            expect(stubs.applyToItems).to.be.called;
            expect(stubs.pendingEmpty).to.be.called;
            expect(stubs.pendingDraw).to.be.called;
            expect(context.stroke).to.be.called;
        });

        it('should clear the canvas when the flag is true', () => {
            drawingThread.draw(context, true);
            expect(context.clearRect).to.be.called;
        });

        it('should not clear the canvas when the flag is true', () => {
            drawingThread.draw(context, false);
            expect(context.clearRect).to.not.be.called;
        });
    });

    describe('emitAvailableActions()', () => {
        afterEach(() => {
            drawingThread.removeAllListeners('annotationevent');
        });

        it('should trigger an annotationevent with the number of available undo and redo actions', (done) => {
            const numItems = {
                undoCount: 3,
                redoCount: 2
            };
            sandbox.stub(drawingThread.pathContainer, 'getNumberOfItems').returns(numItems);
            drawingThread.addListener('annotationevent', (data) => {
                expect(data.type).to.equal('availableactions');
                expect(data.undo).to.equal(numItems.undoCount);
                expect(data.redo).to.equal(numItems.redoCount);
                done();
            });

            drawingThread.emitAvailableActions();
        });
    });

    describe('drawBoundary()', () => {
        beforeEach(() => {
            stubs.getBrowserRectangularBoundary = sandbox.stub(drawingThread, 'getBrowserRectangularBoundary');
        });

        it('should do nothing when the location has no page', () => {
            drawingThread.location = {
                page: undefined
            };

            drawingThread.drawBoundary();
            expect(stubs.getBrowserRectangularBoundary).to.not.be.called;
        });

        it('should draw the boundary of the saved path', () => {
            drawingThread.drawingContext = {
                save: sandbox.stub(),
                beginPath: sandbox.stub(),
                setLineDash: sandbox.stub(),
                rect: sandbox.stub(),
                stroke: sandbox.stub(),
                restore: sandbox.stub()
            };
            stubs.getBrowserRectangularBoundary.returns([1,2,5,6]);
            drawingThread.location = { page: 1 };

            drawingThread.drawBoundary();
            expect(stubs.getBrowserRectangularBoundary).to.be.called;
            expect(drawingThread.drawingContext.save).to.be.called;
            expect(drawingThread.drawingContext.beginPath).to.be.called;
            expect(drawingThread.drawingContext.setLineDash).to.be.called;
            expect(drawingThread.drawingContext.rect).to.be.called;
            expect(drawingThread.drawingContext.stroke).to.be.called;
            expect(drawingThread.drawingContext.restore).to.be.called;
        })
    });

    describe('setBoundary()', () => {
        it('should do nothing when no drawingPaths have been saved', () => {
            drawingThread.location = {};

            drawingThread.setBoundary();
            expect(drawingThread.minX).to.be.undefined;
            expect(drawingThread.maxX).to.be.undefined;
            expect(drawingThread.minY).to.be.undefined;
            expect(drawingThread.maxY).to.be.undefined;
        });

        it('should set the boundary when the location has been assigned', () => {
            drawingThread.location = {
                minX: 5,
                minY: 6,
                maxX: 7,
                maxY: 8
            };

            drawingThread.setBoundary();
            expect(drawingThread.minX).to.equal(drawingThread.location.minX);
            expect(drawingThread.maxX).to.equal(drawingThread.location.maxX);
            expect(drawingThread.minY).to.equal(drawingThread.location.minY);
            expect(drawingThread.maxY).to.equal(drawingThread.location.maxY);
        });
    });

    describe('clearBoundary()', () => {
        it('should clear the drawing context and hide any dialog', () => {
            drawingThread.drawingContext = {
                canvas: {
                    width: 100,
                    height: 100
                },
                clearRect: sandbox.stub()
            };

            drawingThread.dialog = {
                isVisible: sandbox.stub().returns(true),
                hide: sandbox.stub(),
                destroy: () => {},
                removeAllListeners: () => {}
            };

            drawingThread.clearBoundary();
            expect(drawingThread.drawingContext.clearRect).to.be.called;
            expect(drawingThread.dialog.isVisible).to.be.called;
            expect(drawingThread.dialog.hide).to.be.called;
        });
    });
});
