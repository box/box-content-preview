/* eslint-disable no-unused-expressions */
import { ANNOTATION_MODE } from '../constants';
import { ICON_REGION_COMMENT } from '../icons/icons';
import AnnotationControls, {
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
        stubs.annotatorAddListener = sandbox.stub();
        stubs.annotatorRemoveListener = sandbox.stub();
        stubs.classListAdd = sandbox.stub();
        stubs.classListRemove = sandbox.stub();
        stubs.fullscreenAddListener = sandbox.stub(fullscreen, 'addListener');
        stubs.onRegionClick = sandbox.stub();
        stubs.querySelector = sandbox.stub().returns({
            classList: {
                add: stubs.classListAdd,
                remove: stubs.classListRemove,
            },
        });

        const controls = new Controls(document.getElementById('test-annotation-controls-container'));
        const annotator = {
            addListener: stubs.annotatorAddListener,
            removeListener: stubs.annotatorRemoveListener,
        };
        annotationControls = new AnnotationControls(controls, annotator);
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
            expect(annotationControls.annotator).not.to.be.undefined;
            expect(annotationControls.controls).not.to.be.undefined;
            expect(annotationControls.controlsElement).not.to.be.undefined;
            expect(annotationControls.currentActiveControl).to.be.null;
        });

        it('should attach event listeners', () => {
            expect(stubs.fullscreenAddListener).to.be.calledTwice;
            expect(stubs.annotatorAddListener).to.be.called;
        });

        it('should throw an exception if controls is not provided', () => {
            expect(() => new AnnotationControls()).to.throw(Error, 'controls must be an instance of Controls');
        });
    });

    describe('destroy()', () => {
        beforeEach(() => {
            stubs.fullscreenRemoveListener = sandbox.stub(fullscreen, 'removeListener');
        });

        it('should remove all listeners', () => {
            annotationControls.destroy();

            expect(stubs.fullscreenRemoveListener).to.be.calledTwice;
            expect(stubs.annotatorRemoveListener).to.be.called;
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
            stubs.event = sandbox.stub({});
        });

        it('should activate region button then deactivate', () => {
            expect(annotationControls.currentActiveControl).to.be.null;

            annotationControls.handleRegionClick(stubs.onRegionClick)(stubs.event);
            expect(annotationControls.currentActiveControl).to.equal(ANNOTATION_MODE.region);
            expect(stubs.classListAdd).to.be.calledWith(CLASS_BUTTON_ACTIVE);

            annotationControls.handleRegionClick(stubs.onRegionClick)(stubs.event);
            expect(annotationControls.currentActiveControl).to.equal(null);
            expect(stubs.classListRemove).to.be.calledWith(CLASS_BUTTON_ACTIVE);
        });

        it('should call onRegionClick', () => {
            annotationControls.handleRegionClick(stubs.onRegionClick)(stubs.event);

            expect(stubs.onRegionClick).to.be.calledWith({
                activeControl: ANNOTATION_MODE.region,
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

    describe('deactivateCurrentControl()', () => {
        it('should not change if no current active control', () => {
            annotationControls.deactivateCurrentControl();

            expect(annotationControls.currentActiveControl).to.be.null;
        });

        it('should call updateRegionButton if current control is region', () => {
            stubs.updateRegion = sandbox.stub(annotationControls, 'updateRegionButton');
            annotationControls.currentActiveControl = ANNOTATION_MODE.region;

            annotationControls.deactivateCurrentControl();

            expect(annotationControls.currentActiveControl).to.be.null;
            expect(stubs.updateRegion).to.be.called;
        });
    });
});
