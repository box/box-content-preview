/* eslint-disable no-unused-expressions */
import Video360Controls from '../video360-controls';
import { ICON_3D_VR } from '../../../../icons/icons';
import { EVENT_TOGGLE_VR } from '../../box3d-constants';

const sandbox = sinon.sandbox.create();

describe('video360-controls', () => {
    let containerEl;
    let controls;
    const CSS_CLASS_HIDDEN = 'bp-is-hidden';
    const CSS_CLASS_MEDIA_CONTROLS_CONTAINER = 'bp-media-controls-container';
    const CSS_CLASS_MEDIA_CONTROL_BUTTON = 'bp-media-controls-btn';

    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/box3d/video360/__tests__/video360-controls-test.html');
        containerEl = document.querySelector('.container');
        controls = new Video360Controls(containerEl);
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();

        if (controls && typeof controls.destroy === 'function') {
            controls.destroy;
        }

        controls = null;
    });

    describe('constructor()', () => {
        beforeEach(() => {
            sandbox.stub(Video360Controls.prototype, 'addUi');
            sandbox.stub(Video360Controls.prototype, 'attachEventHandlers');
            controls = new Video360Controls(containerEl);
        });

        afterEach(() => {
            controls = null;
        });

        it('should create empty variable for .vrButtonEl reference', () => {
            expect(controls.vrButtonEl).to.be.null;
        });

        it('should set .el to passed in element', () => {
            expect(controls.el).to.deep.equal(containerEl);
        });

        it('should create new bound .handleToggleVr() reference', () => {
            const bindStub = sandbox.stub(Video360Controls.prototype.handleToggleVr, 'bind');
            controls = new Video360Controls(containerEl);
            expect(bindStub).to.have.been.calledWith(controls);
        });

        it('should invoke .addUi() to add ui to element passed in', () => {
            expect(controls.addUi).to.have.been.called;
        });

        it('should invoke .attachEventHandlers() to attach handlers to vr button', () => {
            expect(controls.attachEventHandlers).to.have.been.called;
        });
    });

    describe('addUi()', () => {
        let mediaControlsEl;
        let vrButtonEl;
        let iconSpanEl;

        beforeEach(() => {
            iconSpanEl = {};

            vrButtonEl = {
                setAttribute: sandbox.stub(),
                appendChild: sandbox.stub().returns(iconSpanEl),
                classList: {
                    add: sandbox.stub()
                }
            };

            mediaControlsEl = {
                appendChild: sandbox.stub().returns(vrButtonEl)
            };

            sandbox.stub(Video360Controls.prototype, 'attachEventHandlers');
            sandbox.stub(containerEl, 'querySelector').returns(mediaControlsEl);

            const createElement = sandbox.stub(document, 'createElement');
            createElement.withArgs('button').returns(vrButtonEl);
            createElement.withArgs('span').returns(iconSpanEl);

            controls.addUi();
        });

        afterEach(() => {
            mediaControlsEl = null;
            vrButtonEl = null;
            iconSpanEl = null;
        });

        it('should search .el via .querySelector() with CSS_CLASS_MEDIA_CONTROLS_CONTAINER', () => {
            expect(containerEl.querySelector).to.have.been.calledWith(`.${CSS_CLASS_MEDIA_CONTROLS_CONTAINER}`);
        });

        it('should create a new button and add it to the mediaControlsEl', () => {
            expect(document.createElement).to.have.been.calledWith('button');
            expect(mediaControlsEl.appendChild).to.have.been.calledWith(vrButtonEl);
        });

        it('should add CSS_CLASS_MEDIA_CONTROL_BUTTON to .vrButtonEl', () => {
            expect(vrButtonEl.classList.add).to.have.been.calledWith(CSS_CLASS_MEDIA_CONTROL_BUTTON);
        });

        it('should invoke .vrButtonEl.setAttribute() with args ["aria-label", "Toggle VR display"]', () => {
            expect(vrButtonEl.setAttribute).to.have.been.calledWith('aria-label', 'Toggle VR display');
        });

        it('should invoke .vrButtonEl.setAttribute() with args ["title", "Toggle VR display"]', () => {
            expect(vrButtonEl.setAttribute).to.have.been.calledWith('title', 'Toggle VR display');
        });

        it('should add CSS_CLASS_HIDDEN to .vrButtonEl', () => {
            expect(vrButtonEl.classList.add).to.have.been.calledWith(CSS_CLASS_HIDDEN);
        });

        it('should create a span and add it to .vrButtonEl', () => {
            expect(document.createElement).to.have.been.calledWith('span');
            expect(vrButtonEl.appendChild).to.have.been.calledWith(iconSpanEl);
        });

        it('should set the .innerHtml of the span inside of .vrButtonEl to that of the ICON_3D_VR', () => {
            expect(iconSpanEl.innerHTML).to.deep.equal(ICON_3D_VR);
        });
    });

    describe('attachEventHandlers()', () => {
        it('should invoke .vrButtonEl.addEventListener() with args ["click", .handleToggleVr()]', () => {
            sandbox.stub(Video360Controls.prototype, 'addUi');
            const vrButton = {
                addEventListener: sandbox.stub()
            };
            controls.vrButtonEl = vrButton;

            controls.attachEventHandlers();
            expect(vrButton.addEventListener).to.have.been.calledWith('click', controls.handleToggleVr);

            controls.vrButtonEl = null;
        });
    });

    describe('detachEventHandlers()', () => {
        it('should invoke .vrButtonEl.removeEventListener() with args ["click", .handleToggleVr()]', () => {
            sandbox.stub(Video360Controls.prototype, 'addUi');
            const vrButton = {
                removeEventListener: sandbox.stub()
            };
            controls.vrButtonEl = vrButton;

            controls.detachEventHandlers();
            expect(vrButton.removeEventListener).to.have.been.calledWith('click', controls.handleToggleVr);

            controls.vrButtonEl = null;
        });
    });

    describe('handleToggleVr()', () => {
        it('should invoke .emit() with argument EVENT_TOGGLE_VR', () => {
            sandbox.stub(Video360Controls.prototype, 'addUi');
            sandbox.stub(Video360Controls.prototype, 'attachEventHandlers');
            sandbox.stub(Video360Controls.prototype, 'emit');

            controls.handleToggleVr();
            expect(controls.emit).to.have.been.calledWith(EVENT_TOGGLE_VR);
        });
    });

    describe('showVrButton()', () => {
        it('should invoke .vrButtonEl.classList.remove() with CSS_CLASS_HIDDEN', () => {
            sandbox.stub(Video360Controls.prototype, 'addUi');
            sandbox.stub(Video360Controls.prototype, 'attachEventHandlers');
            const vrButton = {
                classList: {
                    remove: sandbox.stub()
                }
            };
            controls.vrButtonEl = vrButton;

            controls.showVrButton();

            expect(vrButton.classList.remove).to.have.been.calledWith(CSS_CLASS_HIDDEN);
            controls.vrButtonEl = null;
        });
    });

    describe('destroy()', () => {
        beforeEach(() => {
            sandbox.stub(Video360Controls.prototype, 'addUi');
            sandbox.stub(Video360Controls.prototype, 'attachEventHandlers');
            sandbox.stub(Video360Controls.prototype, 'removeAllListeners');
            sandbox.stub(Video360Controls.prototype, 'detachEventHandlers');
        });

        afterEach(() => {
            controls = null;
        });

        it('should invoke .removeAllListeners()', () => {
            controls.destroy();
            expect(controls.removeAllListeners).to.have.been.called;
        });

        it('should invoke .detachEventHandlers()', () => {
            controls.destroy();
            expect(controls.detachEventHandlers).to.have.been.called;
        });

        it('should remove .vrButtonEl from control bar, if available and exists in the DOM', () => {
            const parent = {
                removeChild: sandbox.stub()
            };
            const vrButton = {
                parentElement: parent
            };
            controls.vrButtonEl = vrButton;

            controls.destroy();
            expect(parent.removeChild).to.have.been.calledWith(vrButton);
        });

        it('should nullify .vrButtonEl', () => {
            controls.vrButtonEl = {};
            controls.destroy();

            expect(controls.vrButtonEl).to.be.null;
        });

        it('should nullify .el', () => {
            controls.destroy();

            expect(controls.el).to.be.null;
        });

        it('should nullify .handleToggleVr reference', () => {
            controls.destroy();

            expect(controls.handleToggleVr).to.be.null;
        });
    });
});
