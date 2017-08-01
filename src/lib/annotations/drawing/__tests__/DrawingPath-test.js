import DrawingPath from '../DrawingPath';

let drawingPath;
const sandbox = sinon.sandbox.create();

describe('lib/annotations/drawing/DrawingPath', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        drawingPath = new DrawingPath();
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        drawingPath = null;
    });

    describe('addCoordinate()', () => {
        it('should do nothing if x or y is empty', () => {
            let lengthBefore = drawingPath.path.length;
            drawingPath.addCoordinate({
                x: null,
                y: 2
            });
            drawingPath.addCoordinate({
                x: 2,
                y: null
            });

            let lengthAfter = drawingPath.path.length;

            expect(lengthAfter).to.equal(lengthBefore);

            lengthBefore = drawingPath.browserPath.length;
            drawingPath.addCoordinate({
                x: 1,
                y: 1
            }, {
                x: null,
                y: 1
            });
            drawingPath.addCoordinate({
                x: 1,
                y: 1
            }, {
                x: 1,
                y: null
            });
            lengthAfter = drawingPath.browserPath.length;
            expect(lengthAfter).to.equal(lengthBefore);
        });

        it('should insert the new coordinate into its path container', () => {
            const lengthBefore = drawingPath.path.length;
            drawingPath.addCoordinate({
                x: 1,
                y: 2
            });
            const lengthAfter = drawingPath.path.length;

            expect(lengthAfter).to.equal(lengthBefore + 1);
            expect(drawingPath.path[lengthAfter - 1]).to.deep.equal({
                x: 1,
                y: 2
            });
        });

        it('should update the bounding rectangle', () => {
            const rectBounds = {
                x1: 1,
                x2: 5,
                y1: 2,
                y2: 6
            };

            drawingPath.addCoordinate({
                x: rectBounds.x1,
                y: rectBounds.y1
            });
            drawingPath.addCoordinate({
                x: rectBounds.x2,
                y: rectBounds.y2
            });

            expect(drawingPath.minY).to.equal(rectBounds.y1);
            expect(drawingPath.minX).to.equal(rectBounds.x1);
            expect(drawingPath.maxY).to.equal(rectBounds.y2);
            expect(drawingPath.maxX).to.equal(rectBounds.x2);
        });
    });

    describe('isEmpty()', () => {
        it('should return true when nothing has been inserted', () => {
            expect(drawingPath.isEmpty()).to.be.true;
        });


        it('should return false when a coordinate has been inserted', () => {
            const coord = {
                x: 1,
                y: 1
            }
            drawingPath.addCoordinate(coord);
            expect(drawingPath.isEmpty()).to.be.false;
        });

    });

    describe('drawPath()', () => {
        it('should call context->quadraticCurveTo when there are coordinates', () => {
            const context = {
                quadraticCurveTo: sandbox.stub(),
                moveTo: sandbox.stub()
            };
            const docCoord = {
                x: 1,
                y: 1
            }
            const browserCoord = {
                x: 1,
                y: 1
            }

            drawingPath.addCoordinate(docCoord, browserCoord);
            drawingPath.drawPath(context);

            expect(context.quadraticCurveTo).to.be.called;
            expect(context.moveTo).to.be.called;
        });
    });

    describe('extractDrawingInfo()', () => {
        it('should extract the path attribute from an object', () => {
            const drawingObj = {
                path: 'pathHere',
                extra: 'extraAttribute'
            }
            const result = DrawingPath.extractDrawingInfo(drawingObj);
            expect(result).to.not.deep.equal(drawingObj);
            expect(result.path).to.equal(drawingObj.path);
        });
    });
});
