/* eslint-disable no-unused-expressions */
import { ICON_REGION_COMMENT } from '../icons/icons';
import AnnotationControls, {
    AnnotationMode,
    CLASS_ANNOTATIONS_GROUP,
    CLASS_BUTTON_ACTIVE,
    CLASS_GROUP_HIDE,
    CLASS_REGION_BUTTON,
} from '../AnnotationControls';
import Controls from '../Controls';
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
            expect(annotationControls.currentMode).to.equal(AnnotationMode.NONE);
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
            sandbox.spy(document, 'removeEventListener');
            annotationControls.hasInit = true;

            annotationControls.destroy();

            expect(stubs.fullscreenRemoveListener).to.be.calledTwice;
            expect(document.removeEventListener).to.be.calledWith('keydown', annotationControls.handleKeyDown);
            expect(annotationControls.hasInit).to.equal(false);
        });

        it('should early return if hasInit is false', () => {
            sandbox.spy(document, 'removeEventListener');

            annotationControls.destroy();

            expect(stubs.fullscreenRemoveListener).not.to.be.called;
            expect(document.removeEventListener).not.to.be.called;
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
            annotationControls.init({ fileId: '0', onRegionClick: stubs.onRegionClick });

            expect(annotationControls.controls.add).to.be.calledWith(
                __('region_comment'),
                stubs.regionHandler,
                CLASS_REGION_BUTTON,
                ICON_REGION_COMMENT,
                'button',
                sinon.match.any,
            );
        });

        it('should add keydown event listener', () => {
            sandbox.spy(document, 'addEventListener');

            annotationControls.init({ fileId: '0' });

            expect(document.addEventListener).to.be.calledWith('keydown', annotationControls.handleKeyDown);
        });

        it('should set onRest and hasInit', () => {
            const onEscapeMock = sandbox.stub();

            annotationControls.init({ fileId: '0', onEscape: onEscapeMock });

            expect(annotationControls.onEscape).to.equal(onEscapeMock);
            expect(annotationControls.hasInit).to.equal(true);
        });

        it('should early return if hasInit is true', () => {
            annotationControls.hasInit = true;

            sandbox.spy(document, 'addEventListener');

            annotationControls.init({ fileId: '0' });

            expect(annotationControls.controls.add).not.to.be.called;
            expect(document.addEventListener).not.to.be.called;
        });
    });

    describe('handleKeyDown', () => {
        let eventMock;

        beforeEach(() => {
            annotationControls.resetControls = sandbox.stub();
            annotationControls.currentMode = 'region';
            eventMock = {
                key: 'Escape',
                preventDefault: sandbox.stub(),
                stopPropagation: sandbox.stub(),
            };
        });

        it('should not call resetControls if key is not Escape or mode is none', () => {
            annotationControls.handleKeyDown({ key: 'Enter' });

            expect(annotationControls.resetControls).not.to.be.called;

            annotationControls.currentMode = 'none';
            annotationControls.handleKeyDown({ key: 'Escape' });

            expect(annotationControls.resetControls).not.to.be.called;
        });

        it('should call resetControls and prevent default event', () => {
            annotationControls.handleKeyDown(eventMock);

            expect(eventMock.preventDefault).to.be.called;
            expect(eventMock.stopPropagation).to.be.called;
        });
    });

    describe('handleClick()', () => {
        beforeEach(() => {
            stubs.event = sandbox.stub({});
        });

        it('should activate region button then deactivate', () => {
            expect(annotationControls.currentMode).to.equal(AnnotationMode.NONE);

            annotationControls.handleClick(stubs.onRegionClick, AnnotationMode.REGION)(stubs.event);
            expect(annotationControls.currentMode).to.equal(AnnotationMode.REGION);
            expect(stubs.classListAdd).to.be.calledWith(CLASS_BUTTON_ACTIVE);

            annotationControls.handleClick(stubs.onRegionClick, AnnotationMode.REGION)(stubs.event);
            expect(annotationControls.currentMode).to.equal(AnnotationMode.NONE);
            expect(stubs.classListRemove).to.be.calledWith(CLASS_BUTTON_ACTIVE);
        });

        it('should call onRegionClick', () => {
            annotationControls.handleClick(stubs.onRegionClick, AnnotationMode.REGION)(stubs.event);

            expect(stubs.onRegionClick).to.be.calledWith({
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
            stubs.onEscape = sandbox.stub();
            annotationControls.controlsMap = {
                [AnnotationMode.REGION]: stubs.updateRegionButton,
            };
        });

        it('should not change if no current active control', () => {
            annotationControls.resetControls();

            expect(annotationControls.currentMode).to.equal(AnnotationMode.NONE);
            expect(stubs.updateRegionButton).not.to.be.called;
        });

        it('should call updateRegionButton if current control is region', () => {
            annotationControls.currentMode = AnnotationMode.REGION;

            annotationControls.resetControls();

            expect(annotationControls.currentMode).to.equal(AnnotationMode.NONE);
            expect(stubs.updateRegionButton).to.be.called;
        });
    });
});
