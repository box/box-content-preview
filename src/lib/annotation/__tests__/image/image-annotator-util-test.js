import {
    getRotatedLocation,
    getLocationWithoutRotation,
    getBrowserCoordinatesFromLocation
} from '../../image/image-annotator-util';

const ROTATION_ONCE_DEG = -90;
const ROTATION_TWICE_DEG = -180;
const ROTATION_THRICE_DEG = -270;

describe('image-annotator-util', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('annotation/__tests__/image/image-annotator-util-test.html');
    });

    afterEach(() => {
        fixture.cleanup();
    });

    describe('getRotatedLocation()', () => {
        it('should return annotation coordinates when image is not rotated', () => {
            const [x, y] = [20, 30];
            const [resultX, resultY] = getRotatedLocation(x, y, 0, {}, 1);
            assert.equal(resultX, x, 'Annotation x coordinate should be equal');
            assert.equal(resultY, y, 'Annotation y coordinate should be equal');
        });
        it('should return annotation coordinates when image is rotated left once', () => {
            const [x, y] = [20, 30];

            // Get image height & width dimensions
            const annotatedEl = document.querySelector('.annotated-element');
            const imageDimensions = annotatedEl.querySelector('img').getBoundingClientRect();
            const dimensions = { height: imageDimensions.height, width: imageDimensions.width };

            const [resultX, resultY] = getRotatedLocation(x, y, ROTATION_ONCE_DEG, dimensions, 1);
            assert.equal(resultX, y, 'Annotation x coordinate should be equal');
            assert.equal(resultY, 180, 'Annotation y coordinate should be equal');
        });
        it('should return annotation coordinates when image is rotated left twice', () => {
            const [x, y] = [20, 30];

            // Get image height & width dimensions
            const annotatedEl = document.querySelector('.annotated-element');
            const imageDimensions = annotatedEl.querySelector('img').getBoundingClientRect();
            const dimensions = { height: imageDimensions.height, width: imageDimensions.width };

            const [resultX, resultY] = getRotatedLocation(x, y, ROTATION_TWICE_DEG, dimensions, 1);
            assert.equal(resultX, 80, 'Annotation x coordinate should be equal');
            assert.equal(resultY, 170, 'Annotation y coordinate should be equal');
        });
        it('should return annotation coordinates when image is rotated left thrice', () => {
            const [x, y] = [20, 30];

            // Get image height & width dimensions
            const annotatedEl = document.querySelector('.annotated-element');
            const imageDimensions = annotatedEl.querySelector('img').getBoundingClientRect();
            const dimensions = { height: imageDimensions.height, width: imageDimensions.width };

            const [resultX, resultY] = getRotatedLocation(x, y, ROTATION_THRICE_DEG, dimensions, 1);
            assert.equal(resultX, 70, 'Annotation x coordinate should be equal');
            assert.equal(resultY, x, 'Annotation y coordinate should be equal');
        });
    });

    describe('getLocationWithoutRotation()', () => {
        it('should return annotation coordinates when image was not rotated', () => {
            const [x, y] = [20, 30];
            const [resultX, resultY] = getLocationWithoutRotation(x, y, 0, {}, 1);
            assert.equal(resultX, x, 'Annotation x coordinate should be equal');
            assert.equal(resultY, y, 'Annotation y coordinate should be equal');
        });
        it('should return annotation coordinates when image was rotated left once', () => {
            const [x, y] = [20, 30];

            // Get image height & width dimensions
            const annotatedEl = document.querySelector('.annotated-element');
            const imageDimensions = annotatedEl.querySelector('img').getBoundingClientRect();
            const dimensions = { height: imageDimensions.height, width: imageDimensions.width };

            const [resultX, resultY] = getLocationWithoutRotation(x, y, ROTATION_ONCE_DEG, dimensions, 1);
            assert.equal(resultX, 70, 'Annotation x coordinate should be equal');
            assert.equal(resultY, x, 'Annotation y coordinate should be equal');
        });
        it('should return annotation coordinates when image was rotated left twice', () => {
            const [x, y] = [20, 30];

            // Get image height & width dimensions
            const annotatedEl = document.querySelector('.annotated-element');
            const imageDimensions = annotatedEl.querySelector('img').getBoundingClientRect();
            const dimensions = { height: imageDimensions.height, width: imageDimensions.width };

            const [resultX, resultY] = getLocationWithoutRotation(x, y, ROTATION_TWICE_DEG, dimensions, 1);
            assert.equal(resultX, 80, 'Annotation x coordinate should be equal');
            assert.equal(resultY, 170, 'Annotation y coordinate should be equal');
        });
        it('should return annotation coordinates when image was rotated left thrice', () => {
            const [x, y] = [20, 30];

            // Get image height & width dimensions
            const annotatedEl = document.querySelector('.annotated-element');
            const imageDimensions = annotatedEl.querySelector('img').getBoundingClientRect();
            const dimensions = { height: imageDimensions.height, width: imageDimensions.width };

            const [resultX, resultY] = getLocationWithoutRotation(x, y, ROTATION_THRICE_DEG, dimensions, 1);
            assert.equal(resultX, y, 'Annotation x coordinate should be equal');
            assert.equal(resultY, 180, 'Annotation y coordinate should be equal');
        });
    });

    describe('getBrowserCoordinatesFromLocation()', () => {
        it('should return DOM coordinates from an annotation location object with no padding', () => {
            const location = {
                x: 20,
                y: 30,
                dimensions: {
                    x: 100,
                    y: 200
                }
            };
            const annotatedEl = document.querySelector('.annotated-element');

            assert.equal(getBrowserCoordinatesFromLocation(location, annotatedEl).toString(), [20, 30].toString());
        });
    });
});
