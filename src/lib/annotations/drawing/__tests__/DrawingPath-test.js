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
            const lengthBefore = drawingPath.path.length;
            drawingPath.addCoordinate(null, 2);
            drawingPath.addCoordinate(2, null);
            const lengthAfter = drawingPath.path.length;

            expect(lengthAfter).to.equal(lengthBefore);
        });

        it('should insert the new coordinate into its path container', () => {
            const lengthBefore = drawingPath.path.length;
            drawingPath.addCoordinate(1,2);
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

            drawingPath.addCoordinate(rectBounds.x1, rectBounds.y1);
            drawingPath.addCoordinate(rectBounds.x2, rectBounds.y2);

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
            drawingPath.addCoordinate(1,1);
            expect(drawingPath.isEmpty()).to.be.false;
        });

    });

    describe('drawPath()', () => {
        it('should call context->quadraticCurveTo when there are coordinates', () => {
            const context = {
                quadraticCurveTo: sandbox.stub(),
                moveTo: sandbox.stub()
            };

            drawingPath.addCoordinate(1,1, 1,1);
            drawingPath.drawPath(context);

            expect(context.quadraticCurveTo).to.be.called;
            expect(context.moveTo).to.be.called;
        });
    })
});
