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

            sandbox.stub(window, 'requestAnimationFrame');
            sandbox.stub(docAnnotatorUtil, 'getPageEl')
                   .returns(docDrawingThread.pageEl);
            sandbox.stub(docAnnotatorUtil, 'getBrowserCoordinatesFromLocation')
                   .returns([location.x, location.y]);
        });

        it("should not request an animation frame when the state is not 'draw'", () => {
            const location = {
                x: 0,
                y: 0,
                page: docDrawingThread.page
            };
            docDrawingThread.drawingFlag = STATES_DRAW.idle;
            docDrawingThread.handleMove(location);

            expect(window.requestAnimationFrame).to.not.be.called;
        });

        it("should request an animation frame when the state is 'draw'", () => {
            const location = {
                x: 0,
                y: 0,
                page: docDrawingThread.page
            };
            docDrawingThread.drawingFlag = STATES_DRAW.draw;
            docDrawingThread.handleMove(location);

            expect(window.requestAnimationFrame).to.be.called;
        });
    });


    describe('handleStart()', () => {
        it('should set the drawingFlag, pendingPath, and context if they do not exist', () => {
            const context = "I'm a real context";

            sandbox.stub(annotatorUtil, 'getScale');
            sandbox.stub(docDrawingThread, 'setContextStyles');
            sandbox.stub(docAnnotatorUtil, 'getContext')
                   .returns(context);

            docDrawingThread.drawingFlag = STATES_DRAW.idle;
            docDrawingThread.pendingPath = undefined;
            docDrawingThread.context = undefined;
            docDrawingThread.handleStart();

            expect(docDrawingThread.drawingFlag).to.equal(STATES_DRAW.draw);
            expect(docDrawingThread.drawingContext).to.equal(context);
            expect(docDrawingThread.pendingPath).to.be.an.instanceof(DrawingPath);
            expect(annotatorUtil.getScale).to.be.called;
            expect(docAnnotatorUtil.getContext).to.be.called;
            expect(docDrawingThread.setContextStyles).to.be.called;
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
});
