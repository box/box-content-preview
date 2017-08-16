import DrawingThread from '../DrawingThread';
import AnnotationService from '../../AnnotationService';
import {
    STATES
} from '../../annotationConstants'

let drawingThread;
const sandbox = sinon.sandbox.create();

describe('lib/annotations/drawing/DrawingThread', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
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
            expect(drawingThread.drawingContext.clearRect).to.be.called;
        })
    });

    describe('getDrawings()', () => {
        it('should return all items inserted into the container', () => {
            drawingThread.pathContainer.insert('not a test');
            drawingThread.pathContainer.insert('not a secondary test');

            const allDrawings = drawingThread.getDrawings();

            assert.ok(allDrawings instanceof Array);
            assert.equal(allDrawings.length, 2);
        });

        it('should return an empty array when no items are inserted into the container', () => {
            const allDrawings = drawingThread.getDrawings();

            assert.ok(allDrawings instanceof Array);
            assert.equal(allDrawings.length, 0);
        })
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
        it('should draw the pending path when the context is not empty', () => {
            const timeElapsed = 20000;
            const drawingArray = [];

            sandbox.stub(drawingThread, 'getDrawings')
                   .returns(drawingArray);

            drawingThread.pendingPath = {
                drawPath: sandbox.stub(),
                isEmpty: sandbox.stub().returns(false)
            };
            drawingThread.drawingContext = {
                beginPath: sandbox.stub(),
                stroke: sandbox.stub(),
                clearRect: sandbox.stub(),
                canvas: {
                    width: 2,
                    height: 2
                }
            };
            drawingThread.render(timeElapsed);

            expect(drawingThread.getDrawings).to.be.called;
            expect(drawingThread.drawingContext.clearRect).to.be.called;
            expect(drawingThread.drawingContext.beginPath).to.be.called;
            expect(drawingThread.drawingContext.stroke).to.be.called;
            expect(drawingThread.pendingPath.drawPath).to.be.called;
            expect(drawingThread.pendingPath.isEmpty).to.be.called;
        });

        it('should do nothing when the context is empty', () => {
            const timeElapsed = 20000;

            sandbox.stub(drawingThread, 'getDrawings');
            drawingThread.context = null;
            drawingThread.render(timeElapsed);

            expect(drawingThread.getDrawings).to.not.be.called;
        });
    });

    describe('createAnnotationData()', () => {
        it('should create a valid annotation data object', () => {
            drawingThread.annotationService = {
                user: { id: '1' }
            };

            const placeholder = "String here so string doesn't get fined";
            const annotationData = drawingThread.createAnnotationData('draw', placeholder);

            expect(annotationData.fileVersionId).to.equal(drawingThread.fileVersionId);
            expect(annotationData.threadID).to.equal(drawingThread.threadID);
            expect(annotationData.user.id).to.equal('1');
        });
    });
});
