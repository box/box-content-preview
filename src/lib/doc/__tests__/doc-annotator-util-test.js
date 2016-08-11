import {
    getPageElAndPageNumber,
    isPointInPolyOpt,
    isSelectionPresent,
    convertPDFSpaceToDOMSpace,
    convertDOMSpaceToPDFSpace,
    getDimensionScale,
    getBrowserCoordinatesFromLocation,
    getLowerRightCornerOfLastQuadPoint
} from '../doc-annotator-util';

describe('doc-annotator-util', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('doc/__tests__/doc-annotator-util-test.html');
    });

    afterEach(() => {
        fixture.cleanup();
    });

    describe('getPageElAndPageNumber()', () => {
        it('should return page element and page number that the specified element is on', () => {
            const fooEl = document.querySelector('.foo');
            const pageEl = document.querySelector('.page');
            const result = getPageElAndPageNumber(fooEl);
            assert.equal(result.pageEl, pageEl, 'Page element should be equal');
            assert.equal(result.page, 2, 'Page number should be equal');
        });

        it('should return no page element and -1 page number if no page is found', () => {
            const barEl = document.querySelector('.bar');
            const result = getPageElAndPageNumber(barEl);
            assert.equal(result.pageEl, null, 'Page element should be null');
            assert.equal(result.page, -1, 'Page number should be -1');
        });
    });

    describe('isPointInPolyOpt()', () => {
        it('should return true if point is inside polygon', () => {
            const polygon = [
                [0, 0],
                [100, 0],
                [100, 100],
                [0, 100]
            ];
            assert.ok(isPointInPolyOpt(polygon, 50, 50));
        });

        it('should return false if point is outside polygon', () => {
            const polygon = [
                [0, 0],
                [100, 0],
                [100, 100],
                [0, 100]
            ];
            assert.ok(!isPointInPolyOpt(polygon, 120, 50));
        });
    });

    describe('isSelectionPresent()', () => {
        it('should return true if there is a non-empty selection on the page', () => {
            const barEl = document.querySelector('.bar');
            const range = document.createRange();
            range.selectNode(barEl.childNodes[0]);
            const selection = window.getSelection();
            selection.addRange(range);
            assert.ok(isSelectionPresent());
        });

        it('should return false if there is no non-empty selection on the page', () => {
            assert.ok(!isSelectionPresent());
        });
    });

    describe('convertPDFSpaceToDOMSpace()', () => {
        it('should convert coordinates from PDF space to DOM space', () => {
            const coordinates = [300, 300];

            // 300 * 4/3 * 0.5, 1000 - 300 * 4/3 * 0.5
            const expected = [200, 800];
            assert.equal(convertPDFSpaceToDOMSpace(coordinates, 1000, 0.5).toString(), expected.toString());
        });
    });

    describe('convertDOMSpaceToPDFSpace()', () => {
        it('should convert coordinates from DOM space to PDF space', () => {
            const coordinates = [400, 400];

            // 400 * 3/4 / 0.5 to fixed 4, (1000 - 400) * 3/4 / 0.5 to fixed 4
            const expected = [Number(600).toFixed(4), Number(900).toFixed(4)];
            assert.equal(convertDOMSpaceToPDFSpace(coordinates, 1000, 0.5).toString(), expected.toString());
        });
    });

    describe('getDimensionScale()', () => {
        it('should return null if no dimension scaling is needed', () => {
            const dimensions = {
                x: 100,
                y: 100
            };
            const pageDimensions = {
                width: 100,
                height: 130
            };

            const result = getDimensionScale(dimensions, pageDimensions, 1);
            assert.equal(result, null);
        });

        it('should return dimension scaling factor if dimension scaling is needed', () => {
            const dimensions = {
                x: 100,
                y: 100
            };
            const pageDimensions = {
                width: 200,
                height: 230
            };

            const result = getDimensionScale(dimensions, pageDimensions, 1);
            assert.equal(result.x, 2, 'X scaling should be 2');
            assert.equal(result.y, 2, 'Y scaling should be 2');
        });
    });

    describe('getBrowserCoordinatesFromLocation()', () => {
        it('should return DOM coordinates from an annotation location object', () => {
            const location = {
                x: 300,
                y: 300,
                dimensions: {
                    x: 600,
                    y: 1000
                }
            };

            const annotatedEl = document.querySelector('.annotatedElement');
            annotatedEl.style.height = '1030px';
            annotatedEl.style.width = '600px';

            assert.equal(getBrowserCoordinatesFromLocation(location, annotatedEl).toString(), [400, 600].toString());
        });
    });

    describe('getLowerRightCornerOfLastQuadPoint()', () => {
        const quadPoints = [
            [0, 10, 10, 10, 10, 20, 0, 20],
            [0, 0, 10, 0, 10, 10, 0, 10]
        ];

        assert.equal(getLowerRightCornerOfLastQuadPoint(quadPoints).toString(), [10, 0].toString());
    });
});
