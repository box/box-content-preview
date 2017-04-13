/* eslint-disable no-unused-expressions */
import MultiImageAnnotator from '../MultiImageAnnotator';

let annotator;
const sandbox = sinon.sandbox.create();

describe('lib/annotations/image/MultiImageAnnotator', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('annotations/image/__tests__/MultiImageAnnotator-test.html');
        annotator = new MultiImageAnnotator({
            annotatedElement: document.querySelector('.annotated-element'),
            annotationService: {},
            fileVersionID: 1
        });
    });

    afterEach(() => {
        sandbox.verifyAndRestore();

        annotator = null;
    });

    describe('getLocationFromEvent()', () => {
        let event;
        let target;
        let superGetLocation;
        beforeEach(() => {
            target = {
                nodeName: 'IMG',
                getBoundingClientRect: sandbox.stub(),
                getAttribute: sandbox.stub()
            };
            event = {
                target
            };
            superGetLocation = sandbox.stub();
            Object.defineProperty(Object.getPrototypeOf(MultiImageAnnotator.prototype), 'getLocationFromEvent', {
                value: superGetLocation
            });
        });

        afterEach(() => {
            event = undefined;
            target = undefined;
            superGetLocation = undefined;
        });

        it('should return nothing if an improper location exists', () => {
            superGetLocation.returns(null);

            const location = annotator.getLocationFromEvent(event);
            expect(location).to.be.null;
        });

        it('should return nothing if the element selected isn\'t an image page', () => {
            superGetLocation.returns({});
            target.getAttribute.withArgs('data-page-number').returns(null);
            const location = annotator.getLocationFromEvent(event);
            expect(location).to.be.null;
        });

        it('should return the page number selected', () => {
            const loc = {
                x: 1,
                y: 1,
                imageEl: {},
                width: 100,
                height: 100
            };
            superGetLocation.returns(loc);
            target.getAttribute.withArgs('data-page-number').returns(1);
            const location = annotator.getLocationFromEvent(event);
            expect(location).to.deep.equal({
                page: 1,
                ...loc
            });
        });
    });
});
