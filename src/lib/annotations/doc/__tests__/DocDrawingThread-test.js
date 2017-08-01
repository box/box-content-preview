import * as docAnnotatorUtil from '../docAnnotatorUtil';
import * as annotatorUtil from '../../annotatorUtil';
import DocDrawingThread from '../DocDrawingThread';
import DrawingPath from '../../drawing/DrawingPath';
import {
    STATES_DRAW
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
            docDrawingThread.drawingFlag = STATES_DRAW.idle;
            docDrawingThread.handleMove(docDrawingThread.location);

            expect(docDrawingThread.pendingPath.addCoordinate).to.not.be.called;
        });

        it("should add a coordinate frame when the state is 'draw'", () => {
            docDrawingThread.drawingFlag = STATES_DRAW.draw;
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

            docDrawingThread.drawingFlag = STATES_DRAW.idle;
            docDrawingThread.pendingPath = undefined;
            docDrawingThread.handleStart(docDrawingThread.location);

            expect(window.requestAnimationFrame).to.be.called;
            expect(docDrawingThread.drawingFlag).to.equal(STATES_DRAW.draw);
            expect(docDrawingThread.hasPageChanged).to.be.called;
            expect(docDrawingThread.pendingPath).to.be.an.instanceof(DrawingPath);
        });

        it('should commit the thread when the page changes', () => {
            sandbox.stub(docDrawingThread, 'hasPageChanged').returns(true);
            sandbox.stub(docDrawingThread, 'checkAndHandleScaleUpdate');
            sandbox.stub(docDrawingThread, 'handleStop');
            sandbox.stub(docDrawingThread, 'saveAnnotation');

            docDrawingThread.drawingFlag = STATES_DRAW.idle;
            docDrawingThread.pendingPath = undefined;
            docDrawingThread.handleStart(docDrawingThread.location);
            docDrawingThread.location = {};

            expect(docDrawingThread.hasPageChanged).to.be.called;
            expect(docDrawingThread.handleStop).to.be.called;
            expect(docDrawingThread.saveAnnotation).to.be.called;
            expect(docDrawingThread.checkAndHandleScaleUpdate).to.not.be.called;
            expect(docDrawingThread.drawingFlag).to.equal(STATES_DRAW.idle);
        });
    });

    describe('handleStop()', () => {
        it("should set the state to 'idle' and clear the pendingPath", () => {
            docDrawingThread.drawingFlag = STATES_DRAW.draw;
            docDrawingThread.pendingPath = {
                isEmpty: () => false
            };
            docDrawingThread.pathContainer = {
                insert: sandbox.stub()
            }

            docDrawingThread.handleStop();

            expect(docDrawingThread.drawingFlag).to.equal(STATES_DRAW.idle);
            expect(docDrawingThread.pendingPath).to.be.null;
        });
    });

    describe('checkAndHandleScaleUpdate()', () => {
        it('should update the scale factor when the scale has changed', () => {
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
});
