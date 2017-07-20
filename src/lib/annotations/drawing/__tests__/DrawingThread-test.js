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
        it('should destroy the thread', () => {
            drawingThread.state = STATES.pending;
            assert.notEqual(drawingThread.element, null);

            // This stubs out a parent method by forcing the method we care about
            // in the prototype of the prototype of DrawingThread (ie
            // AnnotationThread's prototype) to be a stub
            Object.defineProperty(Object.getPrototypeOf(DrawingThread.prototype), 'destroy', {
                value: (() => drawingThread.element = null)
            });

            drawingThread.destroy();

            assert.equal(drawingThread.element, null);
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
            drawingThread.context = {
                lineCap: 'not set',
                lineJoin: 'not set',
                strokeStyle: 'no color',
                lineWidth: 'no width'
            };

            const config = {
                SCALE: 2,
                COLOR: 'blue'
            };

            drawingThread.setContextStyles(config);

            assert.deepEqual(drawingThread.context, {
                lineCap: 'round',
                lineJoin: 'round',
                strokeStyle: 'blue',
                lineWidth: drawingThread.context.lineWidth
            });

            assert.ok(drawingThread.context.lineWidth % config.SCALE == 0);
        })
    });

    describe('render()', () => {
        it('should draw the pending path when the context is not empty', () => {
            const timeElapsed = 20000;
            const drawingArray = {
                forEach: sandbox.stub()
            };

            sandbox.stub(drawingThread, 'getDrawings')
                   .returns(drawingArray);
            drawingThread.pendingPath = {
                drawPath: sandbox.stub()
            };
            drawingThread.context = {
                clearRect: sandbox.stub(),
                canvas: {
                    width: 2,
                    height: 2
                }
            };
            drawingThread.render(timeElapsed);

            expect(drawingThread.getDrawings).to.be.called;
            expect(drawingArray.forEach).to.be.called;
            expect(drawingThread.context.clearRect).to.be.called;
            expect(drawingThread.pendingPath.drawPath).to.be.called;
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
