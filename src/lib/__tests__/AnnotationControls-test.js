/* eslint-disable no-unused-expressions */
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
        const controls = new Controls(document.getElementById('test-annotation-controls-container'));
        stubs.fullscreenAddListener = sandbox.stub(fullscreen, 'addListener');
        stubs.onRegionClick = sandbox.stub();
        annotationControls = new AnnotationControls(controls);
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

        it('should attach event listeners', () => {
            expect(stubs.fullscreenAddListener).to.be.calledTwice;
        });

        it('should throw an exception if controls is not provided', () => {
            expect(() => new AnnotationControls()).to.throw(Error, 'controls must be an instance of Controls');
        });
    });

    describe('destroy()', () => {
        beforeEach(() => {
            stubs.fullscreenRemoveAllListeners = sandbox.stub(fullscreen, 'removeAllListeners');
        });

        it('should remove all listeners', () => {
            annotationControls.destroy();

            expect(stubs.fullscreenRemoveAllListeners).to.be.called;
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

    describe('handleFullscreenChange()', () => {
        beforeEach(() => {
            stubs.classListAdd = sandbox.stub();
            stubs.classListRemove = sandbox.stub();
            stubs.querySelector = sandbox.stub().returns({
                classList: {
                    add: stubs.classListAdd,
                    remove: stubs.classListRemove,
                },
            });
            annotationControls.controls.controlsEl.querySelector = stubs.querySelector;
        });

        it('should hide entire group if fullscreen is active', () => {
            annotationControls.handleFullscreenChange(true);
            expect(stubs.querySelector).to.be.calledWith(`.${CLASS_ANNOTATIONS_GROUP}`);
            expect(stubs.classListAdd).to.be.calledWith(CLASS_GROUP_HIDE);

            annotationControls.handleFullscreenChange(false);
            expect(stubs.classListRemove).to.be.calledWith(CLASS_GROUP_HIDE);
        });
    });
});
