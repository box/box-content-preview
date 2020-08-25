/* eslint-disable no-unused-expressions */
import { ICON_REGION_COMMENT } from '../icons/icons';
import AnnotationControls, {
    AnnotationMode,
    CLASS_ANNOTATIONS_BUTTON,
    CLASS_ANNOTATIONS_GROUP,
    CLASS_BUTTON_ACTIVE,
    CLASS_GROUP_HIDE,
    CLASS_REGION_BUTTON,
} from '../AnnotationControls';
import Controls from '../Controls';

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
        stubs.onHighlightClick = sandbox.stub();
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
            expect(annotationControls.currentMode).to.equal(AnnotationMode.NONE);
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

            expect(document.removeEventListener).to.be.calledWith('keydown', annotationControls.handleKeyDown);
            expect(annotationControls.hasInit).to.equal(false);
        });

        it('should early return if hasInit is false', () => {
            sandbox.spy(document, 'removeEventListener');

            annotationControls.destroy();

            expect(document.removeEventListener).not.to.be.called;
        });
    });

    describe('init()', () => {
        beforeEach(() => {
            sandbox.stub(annotationControls, 'addButton');
        });

        it('should only add region button', () => {
            annotationControls.init({ fileId: '0', onRegionClick: stubs.onRegionClick });

            expect(annotationControls.addButton).to.be.calledOnceWith(
                AnnotationMode.REGION,
                stubs.onRegionClick,
                sinon.match.any,
                '0',
            );
        });

        it('should add highlight button', () => {
            annotationControls.init({ fileId: '0', onHighlightClick: stubs.onHighlightClick, showHighlightText: true });

            expect(annotationControls.addButton).to.be.calledWith(
                AnnotationMode.HIGHLIGHT,
                stubs.onHighlightClick,
                sinon.match.any,
                '0',
            );
        });

        it('should add keydown event listener', () => {
            sandbox.spy(document, 'addEventListener');

            annotationControls.init({ fileId: '0' });

            expect(document.addEventListener).to.be.calledWith('keydown', annotationControls.handleKeyDown);
        });

        it('should set onEscape and hasInit', () => {
            const onEscapeMock = sandbox.stub();

            annotationControls.init({ fileId: '0', onEscape: onEscapeMock });

            expect(annotationControls.onEscape).to.equal(onEscapeMock);
            expect(annotationControls.hasInit).to.equal(true);
        });

        it('should early return if hasInit is true', () => {
            annotationControls.hasInit = true;

            sandbox.spy(document, 'addEventListener');

            annotationControls.init({ fileId: '0' });

            expect(annotationControls.addButton).not.to.be.called;
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

    describe('resetControls()', () => {
        beforeEach(() => {
            sandbox.stub(annotationControls, 'updateButton');

            stubs.onEscape = sandbox.stub();
        });

        it('should not change if no current active control', () => {
            annotationControls.resetControls();

            expect(annotationControls.currentMode).to.equal(AnnotationMode.NONE);
            expect(annotationControls.updateButton).not.to.be.called;
        });

        it('should call updateButton if current control is region', () => {
            annotationControls.currentMode = AnnotationMode.REGION;

            annotationControls.resetControls();

            expect(annotationControls.currentMode).to.equal(AnnotationMode.NONE);
            expect(annotationControls.updateButton).to.be.calledWith(AnnotationMode.REGION);
        });
    });

    describe('toggle()', () => {
        it('should show or hide the entire button group', () => {
            annotationControls.toggle(false);
            expect(stubs.querySelector).to.be.calledWith(`.${CLASS_ANNOTATIONS_GROUP}`);
            expect(stubs.classListAdd).to.be.calledWith(CLASS_GROUP_HIDE);

            annotationControls.toggle(true);
            expect(stubs.querySelector).to.be.calledWith(`.${CLASS_ANNOTATIONS_GROUP}`);
            expect(stubs.classListRemove).to.be.calledWith(CLASS_GROUP_HIDE);
        });
    });

    describe('addButton()', () => {
        beforeEach(() => {
            stubs.buttonElement = {
                setAttribute: sandbox.stub(),
            };
            stubs.clickHandler = sandbox.stub();

            sandbox.stub(annotationControls, 'handleClick').returns(stubs.clickHandler);
            sandbox.stub(annotationControls.controls, 'add').returns(stubs.buttonElement);
        });

        it('should do nothing for unknown button', () => {
            annotationControls.addButton('draw', sandbox.stub(), 'group', '0');

            expect(annotationControls.controls.add).not.to.be.called;
        });

        it('should add controls and add resin tags', () => {
            annotationControls.addButton(AnnotationMode.REGION, sandbox.stub(), 'group', '0');

            expect(annotationControls.controls.add).to.be.calledWith(
                __('region_comment'),
                stubs.clickHandler,
                `${CLASS_ANNOTATIONS_BUTTON} ${CLASS_REGION_BUTTON}`,
                ICON_REGION_COMMENT,
                'button',
                'group',
            );

            expect(stubs.buttonElement.setAttribute).to.be.calledWith('data-resin-target', 'highlightRegion');
            expect(stubs.buttonElement.setAttribute).to.be.calledWith('data-resin-fileId', '0');
        });
    });

    describe('setMode()', () => {
        beforeEach(() => {
            annotationControls.resetControls = sandbox.stub();
            annotationControls.updateButton = sandbox.stub();
        });

        it('should do nothing if mode is the same', () => {
            annotationControls.currentMode = 'region';

            annotationControls.setMode('region');

            expect(annotationControls.resetControls).not.to.be.called;
            expect(annotationControls.updateButton).not.to.be.called;
        });

        it('should update controls if mode is not the same', () => {
            annotationControls.currentMode = 'region';

            annotationControls.setMode('highlight');

            expect(annotationControls.resetControls).to.be.called;
            expect(annotationControls.updateButton).to.be.calledWith('highlight');
        });
    });
});
