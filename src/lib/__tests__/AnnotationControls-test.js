/* eslint-disable no-unused-expressions */
import AnnotationControls, { CLASS_REGION_BUTTON, CLASS_BUTTON_ACTIVE } from '../AnnotationControls';
import Controls, { CLASS_BOX_CONTROLS_GROUP_BUTTON } from '../Controls';
import { ICON_REGION_COMMENT } from '../icons/icons';

let annotationControls;
let stubs = {};

const sandbox = sinon.sandbox.create();

describe('lib/AnnotationControls', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('__tests__/AnnotationControls-test.html');
        const controls = new Controls(document.getElementById('test-annotation-controls-container'));
        annotationControls = new AnnotationControls(controls);
        stubs.onRegionClick = sandbox.stub();
    });

    afterEach(() => {
        fixture.cleanup();
        sandbox.verifyAndRestore();

        annotationControls = null;
        stubs = {};
    });

    describe('constructor()', () => {
        it('should create the correct DOM structure', () => {
            expect(annotationControls.controls).not.to.be.undefined;
        });

        it('should throw an exception if controls is not provided', () => {
            expect(() => new AnnotationControls()).to.throw(Error, 'controls must be an instance of Controls');
        });
    });

    describe('init()', () => {
        beforeEach(() => {
            stubs.add = sandbox.stub(annotationControls.controls, 'add');
            stubs.regionHandler = sandbox.stub();
            sandbox.stub(annotationControls, 'handleRegionClick').returns(stubs.regionHandler);
        });

        it('should add the controls', () => {
            annotationControls.init({ onRegionClick: stubs.onRegionClick });

            expect(stubs.add).to.be.calledWith(
                __('region_comment'),
                stubs.regionHandler,
                `${CLASS_BOX_CONTROLS_GROUP_BUTTON} ${CLASS_REGION_BUTTON}`,
                ICON_REGION_COMMENT,
                'button',
                sinon.match.any,
            );
        });
    });

    describe('handleRegionClick()', () => {
        beforeEach(() => {
            stubs.classListAdd = sandbox.stub();
            stubs.classListRemove = sandbox.stub();
            stubs.event = sandbox.stub({
                target: {
                    classList: {
                        add: stubs.classListAdd,
                        remove: stubs.classListRemove,
                    },
                },
            });
        });

        it('should activate region button then deactivate', () => {
            expect(annotationControls.isRegionActive).to.be.false;

            annotationControls.handleRegionClick(stubs.onRegionClick)(stubs.event);
            expect(annotationControls.isRegionActive).to.be.true;
            expect(stubs.classListAdd).to.be.calledWith(CLASS_BUTTON_ACTIVE);

            annotationControls.handleRegionClick(stubs.onRegionClick)(stubs.event);
            expect(annotationControls.isRegionActive).to.be.false;
            expect(stubs.classListRemove).to.be.calledWith(CLASS_BUTTON_ACTIVE);
        });

        it('should call onRegionClick', () => {
            annotationControls.handleRegionClick(stubs.onRegionClick)(stubs.event);

            expect(stubs.onRegionClick).to.be.calledWith({
                isRegionActive: true,
                event: stubs.event,
            });
        });
    });
});
