import * as docAnnotatorUtil from '../docAnnotatorUtil';
import * as annotatorUtil from '../../annotatorUtil';
import DocDrawingThread from '../DocDrawingThread';
import AnnotationThread from '../../AnnotationThread';
import DrawingPath from '../../drawing/DrawingPath';
import {
    DRAW_STATES
} from '../../annotationConstants';

let docDrawingThread;
const sandbox = sinon.sandbox.create();

describe('lib/annotations/doc/DocDrawingThread', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('annotations/doc/__tests__/DocDrawingThread-test.html');
        docDrawingThread = new DocDrawingThread({});
        docDrawingThread.location = {
            x: 0,
            y: 0,
            page: docDrawingThread.page
        };
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        docDrawingThread.destroy();
        docDrawingThread = null;
    });

    describe('handleMove()', () => {
        beforeEach(() => {
            docDrawingThread.pageEl = document.querySelector('.page-element');
            docDrawingThread.page = docDrawingThread.pageEl.getAttribute('page');
            docDrawingThread.pendingPath = {
                addCoordinate: sandbox.stub(),
                isEmpty: sandbox.stub()
            };

            sandbox.stub(docAnnotatorUtil, 'getPageEl')
                   .returns(docDrawingThread.pageEl);
            sandbox.stub(docAnnotatorUtil, 'getBrowserCoordinatesFromLocation')
                   .returns([location.x, location.y]);
        });

        it("should not add a coordinate when the state is not 'draw'", () => {
            docDrawingThread.drawingFlag = DRAW_STATES.idle;
            docDrawingThread.handleMove(docDrawingThread.location);

            expect(docDrawingThread.pendingPath.addCoordinate).to.not.be.called;
        });

        it("should add a coordinate frame when the state is 'draw'", () => {
            docDrawingThread.drawingFlag = DRAW_STATES.drawing;
            docDrawingThread.handleMove(docDrawingThread.location);

            expect(docDrawingThread.pendingPath.addCoordinate).to.be.called;
        });
    });


    describe('handleStart()', () => {
        it('should set the drawingFlag, pendingPath, and context if they do not exist', () => {
            const context = "I'm a real context";

            sandbox.stub(window, 'requestAnimationFrame');
            sandbox.stub(docDrawingThread, 'checkAndHandleScaleUpdate');
            sandbox.stub(docDrawingThread, 'hasPageChanged').returns(false);
            sandbox.stub(docAnnotatorUtil, 'getPageEl')
                   .returns(context);

            docDrawingThread.drawingFlag = DRAW_STATES.idle;
            docDrawingThread.pendingPath = undefined;
            docDrawingThread.handleStart(docDrawingThread.location);

            expect(window.requestAnimationFrame).to.be.called;
            expect(docDrawingThread.drawingFlag).to.equal(DRAW_STATES.drawing);
            expect(docDrawingThread.hasPageChanged).to.be.called;
            expect(docDrawingThread.pendingPath).to.be.an.instanceof(DrawingPath);
        });

        it('should commit the thread when the page changes', () => {
            sandbox.stub(docDrawingThread, 'hasPageChanged').returns(true);
            sandbox.stub(docDrawingThread, 'checkAndHandleScaleUpdate');
            sandbox.stub(docDrawingThread, 'onPageChange');
            sandbox.stub(docDrawingThread, 'saveAnnotation');

            docDrawingThread.pendingPath = undefined;
            docDrawingThread.handleStart(docDrawingThread.location);
            docDrawingThread.location = {};

            expect(docDrawingThread.hasPageChanged).to.be.called;
            expect(docDrawingThread.onPageChange).to.be.called;
            expect(docDrawingThread.checkAndHandleScaleUpdate).to.not.be.called;
        });
    });

    describe('handleStop()', () => {
        it("should set the state to 'idle' and clear the pendingPath", () => {
            sandbox.stub(docDrawingThread, 'emitAvailableActions');
            docDrawingThread.drawingFlag = DRAW_STATES.drawing;
            docDrawingThread.pendingPath = {
                isEmpty: () => false
            };
            docDrawingThread.pathContainer = {
                insert: sandbox.stub()
            }

            docDrawingThread.handleStop();

            expect(docDrawingThread.emitAvailableActions).to.be.called;
            expect(docDrawingThread.drawingFlag).to.equal(DRAW_STATES.idle);
            expect(docDrawingThread.pendingPath).to.be.null;
        });
    });

    describe('onPageChange()', () => {
        it('should emit an annotationevent of type pagechanged and stop a pending drawing', (done) =>{
            sandbox.stub(docDrawingThread, 'handleStop');
            docDrawingThread.addListener('annotationevent', (data) => {
                expect(docDrawingThread.handleStop).to.be.called;
                expect(data.type).to.equal('pagechanged');
                done();
            });

            docDrawingThread.onPageChange();
        });
    });

    describe('checkAndHandleScaleUpdate()', () => {
        it('should update the drawing information when the scale has changed', () => {
            sandbox.stub(docDrawingThread, 'setContextStyles');
            sandbox.stub(annotatorUtil, 'getScale').returns(1.4);
            sandbox.stub(docAnnotatorUtil, 'getPageEl');
            sandbox.stub(docAnnotatorUtil, 'getContext');
            docDrawingThread.lastScaleFactor = 1.1;
            docDrawingThread.location = {
                page: 1
            };
            docDrawingThread.checkAndHandleScaleUpdate();
            expect(docDrawingThread.lastScaleFactor).to.equal(1.4);
            expect(annotatorUtil.getScale).to.be.called;
            expect(docAnnotatorUtil.getPageEl).to.be.called;
            expect(docAnnotatorUtil.getContext).to.be.called;
            expect(docDrawingThread.setContextStyles).to.be.called;
        });

        it('should do nothing when the scale has not changed', () => {
            sandbox.stub(annotatorUtil, 'getScale').returns(1.4);
            sandbox.stub(docAnnotatorUtil, 'getPageEl');
            docDrawingThread.lastScaleFactor = 1.4;
            docDrawingThread.checkAndHandleScaleUpdate();
            expect(annotatorUtil.getScale).to.be.called;
            expect(docAnnotatorUtil.getPageEl).to.not.be.called;
        });
    });

    describe('reconstructBrowserCoordFromLocation()', () => {
        it('should return a browser coordinate when the DocDrawingThread has been assigned a page', () => {
            docDrawingThread.pageEl = 'has been set';
            docDrawingThread.location = {
                dimensions: 'has been set'
            };
            const documentLocation = {
                x: 1,
                y: 2
            };

            sandbox.stub(docAnnotatorUtil, 'getBrowserCoordinatesFromLocation').returns([3,4]);
            const returnValue = docDrawingThread.reconstructBrowserCoordFromLocation(documentLocation);

            expect(returnValue).to.deep.equal({
                x: 3,
                y: 4
            });
        })
    });

    describe('saveAnnotation()', () => {
        const resetValue = AnnotationThread.prototype.saveAnnotation;

        beforeEach(() => {
            Object.defineProperty(AnnotationThread.prototype, 'saveAnnotation', { value: sandbox.stub() });
        });

        afterEach(() => {
            Object.defineProperty(AnnotationThread.prototype, 'saveAnnotation', { value: resetValue });
        });

        it('should clean up without committing when there are no paths to be saved', () => {
            sandbox.stub(docDrawingThread.pathContainer, 'getNumberOfItems').returns({
                undo: 0,
                redo: 1
            });

            docDrawingThread.saveAnnotation('draw');
            expect(docDrawingThread.pathContainer.getNumberOfItems).to.be.called;
            expect(AnnotationThread.prototype.saveAnnotation).to.not.be.called;
        });

        it('should clean up and commit in-progress drawings when there are paths to be saved', () => {
            docDrawingThread.drawingContext = {
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
            const context = {
                drawImage: sandbox.stub()
            };

            sandbox.stub(docAnnotatorUtil, 'getContext').returns(context);
            sandbox.stub(docDrawingThread.pathContainer, 'getNumberOfItems').returns({
                undo: 1,
                redo: 0
            });

            docDrawingThread.saveAnnotation('draw');
            expect(docAnnotatorUtil.getContext).to.be.called;
            expect(docDrawingThread.pathContainer.getNumberOfItems).to.be.called;
            expect(docDrawingThread.drawingContext.clearRect).to.be.called;
            expect(context.drawImage).to.be.called;
            expect(AnnotationThread.prototype.saveAnnotation).to.be.called;
        });
    });

    describe('hasPageChanged()', () => {
        it('should return false when there is no location', () => {
            const value = docDrawingThread.hasPageChanged(undefined);
            expect(value).to.be.falsy;
        });

        it('should return false when there is a location but no page', () => {
            const location = {
                page: undefined
            };
            const value = docDrawingThread.hasPageChanged(location);
            expect(value).to.be.falsy;
        });

        it('should return false when the given location page is the same as the thread location', () => {
            docDrawingThread.location = {
                page: 2
            };
            const location = {
                page: docDrawingThread.location.page
            };
            const value = docDrawingThread.hasPageChanged(location);
            expect(value).to.be.falsy;
        });

        it('should return true when the given location page is different from the thread location', () => {
            docDrawingThread.location = {
                page: 2
            };
            const location = {
                page: (docDrawingThread.location.page + 1)
            };
            const value = docDrawingThread.hasPageChanged(location);
            expect(value).to.be.true;
        });
    });

    describe('show()', () => {

    });
});
