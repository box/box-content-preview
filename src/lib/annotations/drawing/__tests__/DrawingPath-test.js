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
        it('should draw when there are browser coordinates', () => {
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

        it('should not draw when there are no browser coordinates', () => {
            const context = {
                quadraticCurveTo: sandbox.stub(),
                moveTo: sandbox.stub()
            };

            drawingPath.path.push({
                x: 1,
                y: 1
            });

            expect(drawingPath.browserPath.length).to.equal(0);
            drawingPath.drawPath(context);

            expect(context.quadraticCurveTo).to.not.be.called;
            expect(context.moveTo).to.not.be.called;
        });
    });

    describe('generateBrowserPath()', () => {
        it('should generate the browser path', () => {
            const lengthBefore = drawingPath.browserPath.length;
            const transform = (coord) => {
                return {
                    x: coord.x + 1,
                    y: coord.y + 1
                };
            };
            const documentCoord = {
                x: 1,
                y: 2
            };

            drawingPath.path = [documentCoord];
            drawingPath.generateBrowserPath(transform);

            const lengthAfter = drawingPath.browserPath.length;
            const isBrowserCoord = (item => (item.x === documentCoord.x+1 && item.y === documentCoord.y+1));
            expect(lengthBefore).to.be.lessThan(lengthAfter);
            expect(drawingPath.browserPath.find(isBrowserCoord)).to.not.be.undefined;
        });
    });

    describe('extractDrawingInfo()', () => {
        it('should start an accumulator if both objects are drawingPaths', () => {
            const drawingObjA = {
                path: 'pathHereA',
                minX: 5,
                maxX: 6,
                minY: 7,
                maxY: 8,
            };
            const drawingObjB = {
                path: 'pathHereB',
                minX: 9,
                maxX: 10,
                minY: 11,
                maxY: 12,
            };

            const result = DrawingPath.extractDrawingInfo(drawingObjA, drawingObjB);
            expect(result.minX).to.equal(drawingObjA.minX);
            expect(result.minY).to.equal(drawingObjA.minY);
            expect(result.maxX).to.equal(drawingObjB.maxX);
            expect(result.maxY).to.equal(drawingObjB.maxY);
            expect(result.paths).to.deep.equal([drawingObjA.path, drawingObjB.path]);
        });
    });

    it('should add a path to the accumulator', () => {
        const acc = {
            paths: ['pathA', 'pathB'],
            minX: 5,
            maxX: 11,
            minY: 6,
            maxY: 12
        };
        const drawingObjC = {
            path: 'pathC',
            minX: 3,
            maxX: 10,
            minY: 5,
            maxY: 11
        };

        const result = DrawingPath.extractDrawingInfo(acc, drawingObjC);
        expect(result.minX).to.equal(drawingObjC.minX);
        expect(result.minY).to.equal(drawingObjC.minY);
        expect(result.maxX).to.equal(acc.maxX);
        expect(result.maxY).to.equal(acc.maxY);
        expect(result.paths).to.deep.equal(['pathA', 'pathB', 'pathC']);
    });
});
