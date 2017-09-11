import * as docAnnotatorUtil from '../docAnnotatorUtil';
import * as annotatorUtil from '../../annotatorUtil';
import DocDrawingThread from '../DocDrawingThread';
import DocDrawingDialog from '../DocDrawingDialog';
import AnnotationThread from '../../AnnotationThread';
import DrawingPath from '../../drawing/DrawingPath';
import {
    DRAW_STATES,
    STATES
} from '../../annotationConstants';

let thread;
let stubs;
const sandbox = sinon.sandbox.create();

describe('lib/annotations/doc/DocDrawingThread', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('annotations/doc/__tests__/DocDrawingThread-test.html');
        thread = new DocDrawingThread({
            annotationService: {
                user: {
                    id: -1
                }
            }
        });
        thread.location = {
            x: 0,
            y: 0,
            page: thread.page
        };
        sandbox.stub(thread, 'getThreadEventData');
        stubs = {};
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        thread.destroy();
        thread = null;
    });

    describe('handleMove()', () => {
        beforeEach(() => {
            thread.drawingFlag = DRAW_STATES.drawing;
            thread.pageEl = document.querySelector('.page-element');
            thread.page = thread.pageEl.getAttribute('page');
            thread.pendingPath = {
                addCoordinate: sandbox.stub(),
                isEmpty: sandbox.stub()
            };

            sandbox.stub(docAnnotatorUtil, 'getBrowserCoordinatesFromLocation').returns([location.x, location.y]);
        });

        it("should not add a coordinate when the state is not 'draw'", () => {
            thread.drawingFlag = DRAW_STATES.idle;
            thread.handleMove(thread.location);

            expect(thread.pendingPath.addCoordinate).to.not.be.called;
        });

        it("should add a coordinate frame when the state is 'draw'", () => {
            sandbox.stub(thread, 'hasPageChanged').returns(false);
            thread.handleMove(thread.location);

            expect(thread.hasPageChanged).to.be.called;
            expect(thread.pendingPath.addCoordinate).to.be.called;
        });

        it('should do nothing when location is empty', () => {
            sandbox.stub(thread, 'hasPageChanged').returns(false);

            thread.handleMove(undefined);
            expect(thread.hasPageChanged).to.not.be.called;
        });

        it('should only handle page change when the page changes', () => {
            sandbox.stub(thread, 'hasPageChanged').returns(true);
            sandbox.stub(thread, 'onPageChange');

            thread.handleMove({page: 1});
            expect(thread.onPageChange).to.be.called;
        })
    });


    describe('handleStart()', () => {
        it('should set the drawingFlag, pendingPath, and context if they do not exist', () => {
            const context = "I'm a real context";

            sandbox.stub(window, 'requestAnimationFrame');
            sandbox.stub(thread, 'checkAndHandleScaleUpdate');
            sandbox.stub(thread, 'hasPageChanged').returns(false);
            sandbox.stub(docAnnotatorUtil, 'getPageEl')
                   .returns(context);

            thread.drawingFlag = DRAW_STATES.idle;
            thread.pendingPath = undefined;
            thread.handleStart(thread.location);

            expect(window.requestAnimationFrame).to.be.called;
            expect(thread.drawingFlag).to.equal(DRAW_STATES.drawing);
            expect(thread.hasPageChanged).to.be.called;
            expect(thread.pendingPath).to.be.an.instanceof(DrawingPath);
        });

        it('should commit the thread when the page changes', () => {
            sandbox.stub(thread, 'hasPageChanged').returns(true);
            sandbox.stub(thread, 'checkAndHandleScaleUpdate');
            sandbox.stub(thread, 'onPageChange');

            thread.pendingPath = undefined;
            thread.location = {};
            thread.handleStart(thread.location);

            expect(thread.hasPageChanged).to.be.called;
            expect(thread.onPageChange).to.be.called;
            expect(thread.checkAndHandleScaleUpdate).to.not.be.called;
        });

    });

    describe('handleStop()', () => {
        beforeEach(() => {
            stubs.emitAvailableActions = sandbox.stub(thread, 'emitAvailableActions');
            stubs.updateBoundary = sandbox.stub(thread, 'updateBoundary');
            stubs.setBoundary = sandbox.stub(thread, 'setBoundary');
            stubs.drawBoundary = sandbox.stub(thread, 'drawBoundary');
            stubs.createDialog = sandbox.stub(thread, 'createDialog');
            thread.drawingFlag = DRAW_STATES.drawing;
            thread.pendingPath = {
                isEmpty: () => false
            };
            thread.pathContainer = {
                insert: sandbox.stub()
            };
        })
        it("should set the state to 'idle' and clear the pendingPath", () => {
            thread.handleStop();

            expect(stubs.emitAvailableActions).to.be.called;
            expect(stubs.updateBoundary).to.be.called;
            expect(stubs.setBoundary).to.be.called;
            expect(stubs.drawBoundary).to.be.called;
            expect(stubs.createDialog).to.be.called;
            expect(thread.pathContainer.insert).to.be.called;
            expect(thread.drawingFlag).to.equal(DRAW_STATES.idle);
            expect(thread.pendingPath).to.be.null;
        });

        it('should not create a dialog if one already exists', () => {
            thread.dialog = {
                value: 'non-empty',
                removeAllListeners: () => {},
                destroy: () => {},
                isVisible: () => false
            }

            thread.handleStop();
            expect(stubs.createDialog).to.not.be.called;
        });
    });

    describe('onPageChange()', () => {
        it('should emit an annotationevent of type pagechanged and stop a pending drawing', (done) =>{
            sandbox.stub(thread, 'handleStop');
            const location = 'location';
            thread.addListener('threadevent', (data) => {
                done();
            });

            thread.onPageChange(location);
            expect(thread.handleStop).to.be.called;
        });
    });

    describe('checkAndHandleScaleUpdate()', () => {
        it('should update the drawing information when the scale has changed', () => {
            sandbox.stub(thread, 'setContextStyles');
            sandbox.stub(annotatorUtil, 'getScale').returns(1.4);
            sandbox.stub(docAnnotatorUtil, 'getPageEl');
            sandbox.stub(docAnnotatorUtil, 'getContext');
            thread.lastScaleFactor = 1.1;
            thread.location = {
                page: 1
            };
            thread.checkAndHandleScaleUpdate();
            expect(thread.lastScaleFactor).to.equal(1.4);
            expect(annotatorUtil.getScale).to.be.called;
            expect(docAnnotatorUtil.getPageEl).to.be.called;
            expect(docAnnotatorUtil.getContext).to.be.called;
            expect(thread.setContextStyles).to.be.called;
        });

        it('should do nothing when the scale has not changed', () => {
            sandbox.stub(annotatorUtil, 'getScale').returns(1.4);
            sandbox.stub(docAnnotatorUtil, 'getPageEl');
            thread.lastScaleFactor = 1.4;
            thread.checkAndHandleScaleUpdate();
            expect(annotatorUtil.getScale).to.be.called;
            expect(docAnnotatorUtil.getPageEl).to.not.be.called;
        });
    });

    describe('reconstructBrowserCoordFromLocation()', () => {
        it('should return a browser coordinate when the DocDrawingThread has been assigned a page', () => {
            thread.pageEl = 'has been set';
            thread.location = {
                dimensions: 'has been set'
            };
            const documentLocation = {
                x: 1,
                y: 2
            };

            sandbox.stub(docAnnotatorUtil, 'getBrowserCoordinatesFromLocation').returns([3,4]);
            const returnValue = thread.reconstructBrowserCoordFromLocation(documentLocation);

            expect(returnValue).to.deep.equal({
                x: 3,
                y: 4
            });
        })
    });

    describe('saveAnnotation()', () => {
        const resetValue = AnnotationThread.prototype.saveAnnotation;

        beforeEach(() => {
            stubs.setBoundary = sandbox.stub(thread, 'setBoundary');
            stubs.show = sandbox.stub(thread, 'show');
            stubs.createDialog = sandbox.stub(thread, 'createDialog');
            Object.defineProperty(AnnotationThread.prototype, 'saveAnnotation', { value: sandbox.stub() });
        });

        afterEach(() => {
            Object.defineProperty(AnnotationThread.prototype, 'saveAnnotation', { value: resetValue });
        });

        it('should clean up without committing when there are no paths to be saved', () => {
            sandbox.stub(thread, 'reset');
            sandbox.stub(thread.pathContainer, 'isEmpty').returns(true);

            thread.saveAnnotation('draw');
            expect(thread.pathContainer.isEmpty).to.be.called;
            expect(AnnotationThread.prototype.saveAnnotation).to.not.be.called;
            expect(thread.reset).to.be.called;
            expect(stubs.show).to.not.be.called;
            expect(stubs.createDialog).to.not.be.called;
        });

        it('should clean up and commit in-progress drawings when there are paths to be saved', () => {
            thread.drawingContext = {
                canvas: {
                    style: {
                        width: 10,
                        height: 15
                    }
                },
                width: 20,
                height: 30,
                clearRect: sandbox.stub()
            };

            sandbox.stub(thread.pathContainer, 'isEmpty').returns(false);

            thread.saveAnnotation('draw');
            expect(thread.pathContainer.isEmpty).to.be.called;
            expect(thread.drawingContext.clearRect).to.be.called;
            expect(AnnotationThread.prototype.saveAnnotation).to.be.called;
            expect(stubs.show).to.be.called;
            expect(stubs.setBoundary).to.be.called;
            expect(stubs.createDialog).to.be.called;
        });
    });

    describe('hasPageChanged()', () => {
        it('should return false when there is no location', () => {
            const value = thread.hasPageChanged(undefined);
            expect(value).to.be.falsy;
        });

        it('should return false when there is a location but no page', () => {
            const location = {
                page: undefined
            };
            const value = thread.hasPageChanged(location);
            expect(value).to.be.falsy;
        });

        it('should return false when the given location page is the same as the thread location', () => {
            thread.location = {
                page: 2
            };
            const location = {
                page: thread.location.page
            };
            const value = thread.hasPageChanged(location);
            expect(value).to.be.falsy;
        });

        it('should return true when the given location page is different from the thread location', () => {
            thread.location = {
                page: 2
            };
            const location = {
                page: (thread.location.page + 1)
            };
            const value = thread.hasPageChanged(location);
            expect(value).to.be.true;
        });
    });

    describe('show()', () => {
        beforeEach(() => {
            sandbox.stub(thread, 'selectContext');
            sandbox.stub(thread, 'draw');
            thread.pathContainer = {
                applyToItems: sandbox.stub()
            };

            thread.annotatedElement = 'annotatedEl';
            thread.location = 'loc';
        });

        it('should do nothing when no element is assigned to the DocDrawingThread', () => {
            thread.annotatedElement = undefined;
            thread.show();
            expect(thread.selectContext).to.not.be.called;
        });

        it('should do nothing when no location is assigned to the DocDrawingThread', () => {
            thread.location = undefined;
            thread.show();
            expect(thread.selectContext).to.not.be.called;
        });

        it('should draw the paths in the thread', () => {
            thread.state = 'not pending';
            thread.show();
            expect(thread.selectContext).to.be.called;
            expect(thread.draw).to.be.called;
        });

        it('should draw the boundary when a dialog exists and is visible', () => {
            sandbox.stub(thread, 'drawBoundary');
            thread.dialog = {
                isVisible: sandbox.stub().returns(true),
                destroy: () => {},
                removeAllListeners: () => {},
                hide: () => {},
                show: sandbox.stub()
            }

            thread.show();
            expect(thread.dialog.isVisible).to.be.called;
            expect(thread.drawBoundary).to.be.called;
            expect(thread.dialog.show).to.be.called;
        })
    });

    describe('selectContext()', () => {
        beforeEach(() => {
            sandbox.stub(thread, 'checkAndHandleScaleUpdate');
            sandbox.stub(thread, 'setContextStyles');
            stubs.context = sandbox.stub(docAnnotatorUtil, 'getContext');
        });

        it('should return the pending drawing context when the state is pending', () => {
            thread.state = STATES.pending;
            thread.drawingContext = {
                clearRect: sandbox.stub(),
                canvas: {
                    height: 100,
                    width: 100
                }
            };

            const retValue = thread.selectContext();
            expect(thread.checkAndHandleScaleUpdate).to.be.called;
            expect(docAnnotatorUtil.getContext).to.not.be.called;
            expect(retValue).to.deep.equal(thread.drawingContext);
        });

        it('should set and return the concrete context when the state is not pending', () => {
            const concreteContext = {
                clearRect: sandbox.stub(),
                canvas: {
                    height: 100,
                    width: 100
                }
            };

            stubs.context.returns(concreteContext);
            thread.state = STATES.idle;

            const retValue = thread.selectContext();
            expect(thread.checkAndHandleScaleUpdate).to.be.called;
            expect(thread.setContextStyles).to.be.called;
            expect(docAnnotatorUtil.getContext).to.be.called;
            expect(retValue).to.deep.equal(thread.concreteContext);
        });
    });

    describe('getBrowserRectangularBoundary()', () => {
        it('should return null when no thread has not been assigned a location', () => {
            thread.location = undefined;

            const value = thread.getBrowserRectangularBoundary();
            expect(value).to.be.null;
        });

        it('should return a starting coordinate along with a height and width', () => {
            thread.pageEl = 'page';
            thread.location = {
                dimensions: 'not empty'
            };

            stubs.createLocation = sandbox.stub(annotatorUtil, 'createLocation');
            stubs.getBrowserCoordinates = sandbox.stub(docAnnotatorUtil, 'getBrowserCoordinatesFromLocation');
            stubs.getBrowserCoordinates.onCall(0).returns([5, 5]);
            stubs.getBrowserCoordinates.onCall(1).returns([50, 45]);

            const value = thread.getBrowserRectangularBoundary();
            expect(stubs.createLocation).to.be.called.twice;
            expect(stubs.getBrowserCoordinates).to.be.called.twice;
            expect(value).to.deep.equal([5, 5, 45, 40]);
        });
    });

    describe('createDialog()', () => {
        it('should create a new doc drawing dialog', () => {
            const existingDialog = {
                destroy: sandbox.stub()
            };

            sandbox.stub(thread, 'bindCustomListenersOnDialog');
            thread.dialog = existingDialog;
            thread.annotationService = {
                canAnnotate: true,
                user: { id: -1 }
            };

            thread.createDialog();

            expect(existingDialog.destroy).to.be.called;
            expect(thread.dialog instanceof DocDrawingDialog).to.be.truthy;
            expect(thread.bindCustomListenersOnDialog).to.be.called;
        });
    });

    describe('bindCustomListenersOnDialog', () => {
        it('should bind listeners on the dialog', () => {
            thread.dialog = {
                addListener: sandbox.stub(),
                removeAllListeners: sandbox.stub(),
                hide: sandbox.stub(),
                destroy: sandbox.stub(),
                isVisible: sandbox.stub()
            };

            thread.bindCustomListenersOnDialog();
            expect(thread.dialog.addListener).to.be.calledWith('annotationcreate', sinon.match.func);
            expect(thread.dialog.addListener).to.be.calledWith('annotationdelete', sinon.match.func);
        });
    });
});
