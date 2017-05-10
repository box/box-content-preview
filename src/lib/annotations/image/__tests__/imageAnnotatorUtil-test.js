import {
    getRotatedLocation,
    getLocationWithoutRotation,
    getRotatedPadding,
    getBrowserCoordinatesFromLocation
} from '../imageAnnotatorUtil';

const ROTATION_ONCE_DEG = -90;
const ROTATION_TWICE_DEG = -180;
const ROTATION_THRICE_DEG = -270;

describe('lib/annotations/image/imageAnnotatorUtil', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('annotations/image/__tests__/imageAnnotatorUtil-test.html');
    });

    afterEach(() => {
        fixture.cleanup();
    });

    describe('getRotatedLocation()', () => {
        it('should return annotation coordinates when image is not rotated', () => {
            const [x, y] = [20, 30];
            const [resultX, resultY] = getRotatedLocation(x, y, 0, {}, 1);
            expect(resultX).to.equal(x);
            expect(resultY).to.equal(y);
        });
        it('should return annotation coordinates when image is rotated left once', () => {
            const [x, y] = [20, 30];

            // Get image height & width dimensions
            const annotatedEl = document.querySelector('.annotated-element');
            const imageDimensions = annotatedEl.querySelector('img').getBoundingClientRect();
            const dimensions = { height: imageDimensions.height, width: imageDimensions.width };

            const [resultX, resultY] = getRotatedLocation(x, y, ROTATION_ONCE_DEG, dimensions, 1);
            expect(resultX).to.equal(y);
            expect(resultY).to.equal(180);
        });
        it('should return annotation coordinates when image is rotated left twice', () => {
            const [x, y] = [20, 30];

            // Get image height & width dimensions
            const annotatedEl = document.querySelector('.annotated-element');
            const imageDimensions = annotatedEl.querySelector('img').getBoundingClientRect();
            const dimensions = { height: imageDimensions.height, width: imageDimensions.width };

            const [resultX, resultY] = getRotatedLocation(x, y, ROTATION_TWICE_DEG, dimensions, 1);
            expect(resultX).to.equal(80);
            expect(resultY).to.equal(170);
        });
        it('should return annotation coordinates when image is rotated left thrice', () => {
            const [x, y] = [20, 30];

            // Get image height & width dimensions
            const annotatedEl = document.querySelector('.annotated-element');
            const imageDimensions = annotatedEl.querySelector('img').getBoundingClientRect();
            const dimensions = { height: imageDimensions.height, width: imageDimensions.width };

            const [resultX, resultY] = getRotatedLocation(x, y, ROTATION_THRICE_DEG, dimensions, 1);
            expect(resultX).to.equal(70);
            expect(resultY).to.equal(x);
        });
    });

    describe('getLocationWithoutRotation()', () => {
        it('should return annotation coordinates when image was not rotated', () => {
            const [x, y] = [20, 30];
            const [resultX, resultY] = getLocationWithoutRotation(x, y, 0, {}, 1);
            expect(resultX).to.equal(x);
            expect(resultY).to.equal(y);
        });
        it('should return annotation coordinates when image was rotated left once', () => {
            const [x, y] = [20, 30];

            // Get image height & width dimensions
            const annotatedEl = document.querySelector('.annotated-element');
            const imageDimensions = annotatedEl.querySelector('img').getBoundingClientRect();
            const dimensions = { height: imageDimensions.height, width: imageDimensions.width };

            const [resultX, resultY] = getLocationWithoutRotation(x, y, ROTATION_ONCE_DEG, dimensions, 1);
            expect(resultX).to.equal(70);
            expect(resultY).to.equal(x);
        });
        it('should return annotation coordinates when image was rotated left twice', () => {
            const [x, y] = [20, 30];

            // Get image height & width dimensions
            const annotatedEl = document.querySelector('.annotated-element');
            const imageDimensions = annotatedEl.querySelector('img').getBoundingClientRect();
            const dimensions = { height: imageDimensions.height, width: imageDimensions.width };

            const [resultX, resultY] = getLocationWithoutRotation(x, y, ROTATION_TWICE_DEG, dimensions, 1);
            expect(resultX).to.equal(80);
            expect(resultY).to.equal(170);
        });
        it('should return annotation coordinates when image was rotated left thrice', () => {
            const [x, y] = [20, 30];

            // Get image height & width dimensions
            const annotatedEl = document.querySelector('.annotated-element');
            const imageDimensions = annotatedEl.querySelector('img').getBoundingClientRect();
            const dimensions = { height: imageDimensions.height, width: imageDimensions.width };

            const [resultX, resultY] = getLocationWithoutRotation(x, y, ROTATION_THRICE_DEG, dimensions, 1);
            expect(resultX).to.equal(y);
            expect(resultY).to.equal(180);
        });
    });

    describe('getRotatedPadding()', () => {
        it('should return top padding if image is not rotated', () => {
            const annotatedEl = document.querySelector('.annotated-element');
            const imageEl = annotatedEl.querySelector('img');
            imageEl.style.margin = '50px';

            const rotatedPadding = getRotatedPadding(imageEl, false);

            // Includes top 8px padding around annotatedEl
            expect(rotatedPadding).to.equal(58);
        });

        it('should return top padding if image is rotated', () => {
            const annotatedEl = document.querySelector('.annotated-element');
            const imageEl = annotatedEl.querySelector('img');
            imageEl.style.margin = '50px';

            const rotatedPadding = getRotatedPadding(imageEl, true);

            // Includes top 8px padding around annotatedEl
            expect(rotatedPadding).to.equal(35.5);
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
                },
                page: 1
            };
            const annotatedEl = document.querySelector('.annotated-element');
            const coordinates = getBrowserCoordinatesFromLocation(location, annotatedEl);

            expect(coordinates[0]).to.equal(20);
            expect(coordinates[1]).to.equal(30);
        });
    });
});
