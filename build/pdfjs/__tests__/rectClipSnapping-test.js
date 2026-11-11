const { bcpGetRectBounds, bcpSnapRectToPixels } = require('../rectClipSnapping');

const MOVE = 0;
const LINE = 1;
const CURVE = 2;
const CLOSE = 4;
const createRectOps = (x, y, width, height) => [
    MOVE,
    x,
    y,
    LINE,
    x + width,
    y,
    LINE,
    x + width,
    y + height,
    LINE,
    x,
    y + height,
    CLOSE,
];
const createMatrix = (a, b, c, d, e, f) => ({ a, b, c, d, e, f });

describe('bcpGetRectBounds', () => {
    test('should return the bounds of a rectangle from the re operator', () => {
        const ops = Float32Array.from(createRectOps(10.5, 20.25, 30, 40));

        expect(bcpGetRectBounds(ops, MOVE, LINE, CLOSE)).toEqual([10.5, 20.25, 40.5, 60.25]);
    });

    test('should return the bounds of a rectangle drawn counterclockwise from any corner', () => {
        const ops = [MOVE, 5, 9, LINE, 5, 1, LINE, 2, 1, LINE, 2, 9];

        expect(bcpGetRectBounds(ops, MOVE, LINE, CLOSE)).toEqual([2, 1, 5, 9]);
    });

    test('should accept a fourth line back to the start with or without closePath', () => {
        const ops = [MOVE, 0, 0, LINE, 8, 0, LINE, 8, 4, LINE, 0, 4, LINE, 0, 0];

        expect(bcpGetRectBounds(ops, MOVE, LINE, CLOSE)).toEqual([0, 0, 8, 4]);
        expect(bcpGetRectBounds([...ops, CLOSE], MOVE, LINE, CLOSE)).toEqual([0, 0, 8, 4]);
    });

    test.each([
        ['a rotated rectangle', [MOVE, 0, 0, LINE, 4, 1, LINE, 3, 5, LINE, -1, 4, CLOSE]],
        [
            'a fourth line that does not return to the start',
            [MOVE, 0, 0, LINE, 8, 0, LINE, 8, 4, LINE, 0, 4, LINE, 0, 1],
        ],
        ['two rectangles', [...createRectOps(0, 0, 1, 1), ...createRectOps(2, 2, 1, 1)]],
        ['a curve', [MOVE, 0, 0, LINE, 8, 0, CURVE, 8, 1, 8, 3, 8, 4, LINE, 0, 4]],
        ['a zero-height rectangle', [MOVE, 0, 0, LINE, 8, 0, LINE, 8, 0, LINE, 0, 0, CLOSE]],
        ['a spur that doubles back along one edge', [MOVE, 0, 0, LINE, 8, 0, LINE, 4, 0, LINE, 4, 4, CLOSE]],
        ['an L-shaped polygon', [MOVE, 0, 0, LINE, 8, 0, LINE, 8, 4, LINE, 4, 4, LINE, 4, 8, LINE, 0, 8, CLOSE]],
    ])('should reject %s', (description, ops) => {
        expect(bcpGetRectBounds(ops, MOVE, LINE, CLOSE)).toBeNull();
    });
});

describe('bcpSnapRectToPixels', () => {
    test('should round each device-space edge to the nearest pixel', () => {
        const [x, y, width, height] = bcpSnapRectToPixels([10.2, 20.6, 30.4, 40.5], createMatrix(1, 0, 0, 1, 0, 0));

        expect([x, y, width, height]).toEqual([10, 21, 20, 20]);
    });

    test('should return path-space values that land on whole device pixels under a flipped scale', () => {
        const transform = createMatrix(1.37, 0, 0, -1.37, 3.1, 815.6);
        const [x, y, width, height] = bcpSnapRectToPixels([12.3, 45.6, 78.9, 101.2], transform);
        const deviceEdges = [
            transform.a * x + transform.e,
            transform.a * (x + width) + transform.e,
            transform.d * y + transform.f,
            transform.d * (y + height) + transform.f,
        ];

        deviceEdges.forEach(edge => expect(Math.abs(edge - Math.round(edge))).toBeLessThan(1e-9));
        expect(deviceEdges.map(Math.round)).toEqual([20, 111, 753, 677]);
        expect(width).toBeGreaterThan(0);
        expect(height).toBeGreaterThan(0);
    });

    test('should give two rectangles sharing an edge the same snapped edge', () => {
        const transform = createMatrix(1.37, 0, 0, -1.37, 0, 815.6);
        const [, upperY] = bcpSnapRectToPixels([0, 30.3, 100, 60.7], transform);
        const [, lowerY, , lowerHeight] = bcpSnapRectToPixels([0, 0, 100, 30.3], transform);

        expect(upperY).toBeCloseTo(lowerY + lowerHeight, 9);
    });

    test('should snap under a quarter-turn rotation, where path x maps to device y', () => {
        const transform = createMatrix(0, 1.37, 1.37, 0, 2.2, 4.4);
        const [x, y, width, height] = bcpSnapRectToPixels([12.3, 45.6, 78.9, 101.2], transform);
        const deviceEdges = [
            transform.c * y + transform.e,
            transform.c * (y + height) + transform.e,
            transform.b * x + transform.f,
            transform.b * (x + width) + transform.f,
        ];

        deviceEdges.forEach(edge => expect(Math.abs(edge - Math.round(edge))).toBeLessThan(1e-9));
        expect(deviceEdges.map(Math.round)).toEqual([65, 141, 21, 112]);
        expect(width).toBeGreaterThan(0);
        expect(height).toBeGreaterThan(0);
    });

    test.each([
        ['a 30 degree rotation', createMatrix(0.866, 0.5, -0.5, 0.866, 0, 0)],
        ['a skew', createMatrix(1, 0, 0.3, 1, 0, 0)],
        ['a zero scale', createMatrix(0, 0, 0, 1, 0, 0)],
        ['a non-finite transform', createMatrix(NaN, 0, 0, 1, 0, 0)],
    ])('should leave the clip alone under %s', (description, transform) => {
        expect(bcpSnapRectToPixels([0, 0, 10, 10], transform)).toBeNull();
    });

    test('should leave a clip alone when rounding would leave it with no area', () => {
        expect(bcpSnapRectToPixels([0, 10.1, 100, 10.4], createMatrix(1, 0, 0, 1, 0, 0))).toBeNull();
    });
});
