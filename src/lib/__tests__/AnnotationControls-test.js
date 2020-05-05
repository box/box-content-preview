/* eslint-disable no-unused-expressions */
import { ICON_REGION_COMMENT } from '../icons/icons';
import AnnotationControls, {
    AnnotationMode,
    CLASS_ANNOTATIONS_GROUP,
    CLASS_BUTTON_ACTIVE,
    CLASS_GROUP_HIDE,
    CLASS_REGION_BUTTON,
} from '../AnnotationControls';
import Controls, { CLASS_BOX_CONTROLS_GROUP_BUTTON } from '../Controls';
import fullscreen from '../Fullscreen';

let annotationControls;
let stubs = {};

const sandbox = sinon.sandbox.create();

describe('lib/AnnotationControls', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('__tests__/AnnotationControls-test.html');
        stubs.classListAdd = sandbox.stub();
        stubs.classListRemove = sandbox.stub();
        stubs.fullscreenAddListener = sandbox.stub(fullscreen, 'addListener');
        stubs.fullscreenRemoveListener = sandbox.stub(fullscreen, 'removeListener');
        stubs.onRegionClick = sandbox.stub();
        stubs.querySelector = sandbox.stub().returns({
            classList: {
                add: stubs.classListAdd,
                remove: stubs.classListRemove,
            },
        });

        const controls = new Controls(document.getElementById('test-annotation-controls-container'));
        annotationControls = new AnnotationControls(controls);
        annotationControls.controlsElement.querySelector = stubs.querySelector;
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
            expect(annotationControls.controlsElement).not.to.be.undefined;
            expect(annotationControls.controlsMap).not.to.be.undefined;
            expect(annotationControls.currentActiveControl).to.equal(AnnotationMode.NONE);
        });

        it('should attach event listeners', () => {
            expect(stubs.fullscreenAddListener).to.be.calledTwice;
        });

        it('should throw an exception if controls is not provided', () => {
            expect(() => new AnnotationControls()).to.throw(Error, 'controls must be an instance of Controls');
        });
    });

    describe('destroy()', () => {
        it('should remove all listeners', () => {
            annotationControls.destroy();

            expect(stubs.fullscreenRemoveListener).to.be.calledTwice;
        });
    });

    describe('init()', () => {
        beforeEach(() => {
            stubs.regionButton = {
                setAttribute: sandbox.stub(),
            };
            stubs.regionHandler = sandbox.stub();

            sandbox.stub(annotationControls, 'handleClick').returns(stubs.regionHandler);
            sandbox.stub(annotationControls.controls, 'add').returns(stubs.regionButton);
        });

        it('should add the controls', () => {
            annotationControls.init({ onRegionClick: stubs.onRegionClick });

            expect(annotationControls.controls.add).to.be.calledWith(
                __('region_comment'),
                stubs.regionHandler,
                `${CLASS_BOX_CONTROLS_GROUP_BUTTON} ${CLASS_REGION_BUTTON}`,
                ICON_REGION_COMMENT,
                'button',
                sinon.match.any,
            );
        });
    });

    describe('handleClick()', () => {
        beforeEach(() => {
            stubs.event = sandbox.stub({});
        });

        it('should activate region button then deactivate', () => {
            expect(annotationControls.currentActiveControl).to.equal(AnnotationMode.NONE);

            annotationControls.handleClick(stubs.onRegionClick, AnnotationMode.REGION)(stubs.event);
            expect(annotationControls.currentActiveControl).to.equal(AnnotationMode.REGION);
            expect(stubs.classListAdd).to.be.calledWith(CLASS_BUTTON_ACTIVE);

            annotationControls.handleClick(stubs.onRegionClick, AnnotationMode.REGION)(stubs.event);
            expect(annotationControls.currentActiveControl).to.equal(AnnotationMode.NONE);
            expect(stubs.classListRemove).to.be.calledWith(CLASS_BUTTON_ACTIVE);
        });

        it('should call onRegionClick', () => {
            annotationControls.handleClick(stubs.onRegionClick, AnnotationMode.REGION)(stubs.event);

            expect(stubs.onRegionClick).to.be.calledWith({
                activeControl: AnnotationMode.REGION,
                event: stubs.event,
            });
        });
    });

    describe('handleFullscreenChange()', () => {
        it('should hide entire group if fullscreen is active', () => {
            annotationControls.handleFullscreenEnter();
            expect(stubs.querySelector).to.be.calledWith(`.${CLASS_ANNOTATIONS_GROUP}`);
            expect(stubs.classListAdd).to.be.calledWith(CLASS_GROUP_HIDE);

            annotationControls.handleFullscreenExit();
            expect(stubs.querySelector).to.be.calledWith(`.${CLASS_ANNOTATIONS_GROUP}`);
            expect(stubs.classListRemove).to.be.calledWith(CLASS_GROUP_HIDE);
        });
    });

    describe('resetControls()', () => {
        beforeEach(() => {
            stubs.updateRegionButton = sandbox.stub();
            annotationControls.controlsMap = {
                [AnnotationMode.REGION]: stubs.updateRegionButton,
            };
        });

        it('should not change if no current active control', () => {
            annotationControls.resetControls();

            expect(annotationControls.currentActiveControl).to.equal(AnnotationMode.NONE);
            expect(stubs.updateRegionButton).not.to.be.called;
        });

        it('should call updateRegionButton if current control is region', () => {
            annotationControls.currentActiveControl = AnnotationMode.REGION;

            annotationControls.resetControls();

            expect(annotationControls.currentActiveControl).to.equal(AnnotationMode.NONE);
            expect(stubs.updateRegionButton).to.be.called;
        });
    });

    describe('getActiveMode()', () => {
        it('should return the current active mode', () => {
            annotationControls.currentActiveControl = 'region';
            expect(annotationControls.getActiveMode()).to.equal('region');
        });
    });
});
