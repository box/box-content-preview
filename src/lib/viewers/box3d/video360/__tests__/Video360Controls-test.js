/* eslint-disable no-unused-expressions */
import Video360Controls from '../Video360Controls';
import { ICON_3D_VR } from '../../../../icons';
import { EVENT_TOGGLE_VR } from '../../box3DConstants';

describe('lib/viewers/box3d/video360/Video360Controls', () => {
    let containerEl;
    let controls;
    const CSS_CLASS_HIDDEN = 'bp-is-hidden';
    const CSS_CLASS_MEDIA_CONTROLS_CONTAINER = 'bp-media-controls-container';
    const CSS_CLASS_MEDIA_CONTROL_BUTTON = 'bp-media-controls-btn';

    beforeEach(() => {
        fixture.load('viewers/box3d/video360/__tests__/Video360Controls-test.html');
        containerEl = document.querySelector('.container');
        controls = new Video360Controls(containerEl);
    });

    afterEach(() => {
        fixture.cleanup();

        if (controls && typeof controls.destroy === 'function') {
            controls.destroy;
        }

        controls = null;
    });

    describe('constructor()', () => {
        beforeEach(() => {
            jest.spyOn(Video360Controls.prototype, 'addUi').mockImplementation();
            jest.spyOn(Video360Controls.prototype, 'attachEventHandlers').mockImplementation();
            controls = new Video360Controls(containerEl);
        });

        afterEach(() => {
            controls = null;
        });

        test('should create empty variable for .vrButtonEl reference', () => {
            expect(controls.vrButtonEl).toBeNull();
        });

        test('should set .el to passed in element', () => {
            expect(controls.el).toBe(containerEl);
        });

        test('should create new bound .handleToggleVr() reference', () => {
            const bindStub = jest.spyOn(Video360Controls.prototype.handleToggleVr, 'bind');
            controls = new Video360Controls(containerEl);
            expect(bindStub).toBeCalledWith(controls);
        });

        test('should invoke .addUi() to add ui to element passed in', () => {
            expect(controls.addUi).toBeCalled();
        });

        test('should invoke .attachEventHandlers() to attach handlers to vr button', () => {
            expect(controls.attachEventHandlers).toBeCalled();
        });
    });

    describe('addUi()', () => {
        let mediaControlsEl;
        let vrButtonEl;
        let iconSpanEl;

        beforeEach(() => {
            iconSpanEl = {};

            vrButtonEl = {
                setAttribute: jest.fn(),
                appendChild: jest.fn().mockReturnValue(iconSpanEl),
                classList: {
                    add: jest.fn(),
                },
            };

            mediaControlsEl = {
                appendChild: jest.fn().mockReturnValue(vrButtonEl),
            };

            jest.spyOn(Video360Controls.prototype, 'attachEventHandlers');
            jest.spyOn(containerEl, 'querySelector').mockReturnValue(mediaControlsEl);
            jest.spyOn(document, 'createElement')
                .mockImplementation()
                .mockReturnValueOnce(vrButtonEl)
                .mockReturnValueOnce(iconSpanEl);

            controls.addUi();
        });

        afterEach(() => {
            mediaControlsEl = null;
            vrButtonEl = null;
            iconSpanEl = null;
        });

        test('should search .el via .querySelector() with CSS_CLASS_MEDIA_CONTROLS_CONTAINER', () => {
            expect(containerEl.querySelector).toBeCalledWith(`.${CSS_CLASS_MEDIA_CONTROLS_CONTAINER}`);
        });

        test('should create a new button and add it to the mediaControlsEl', () => {
            expect(document.createElement).toBeCalledWith('button');
            expect(mediaControlsEl.appendChild).toBeCalledWith(vrButtonEl);
        });

        test('should add CSS_CLASS_MEDIA_CONTROL_BUTTON to .vrButtonEl', () => {
            expect(vrButtonEl.classList.add).toBeCalledWith(CSS_CLASS_MEDIA_CONTROL_BUTTON);
        });

        test('should invoke .vrButtonEl.setAttribute() with args ["aria-label", "Toggle VR display"]', () => {
            expect(vrButtonEl.setAttribute).toBeCalledWith('aria-label', 'Toggle VR display');
        });

        test('should invoke .vrButtonEl.setAttribute() with args ["title", "Toggle VR display"]', () => {
            expect(vrButtonEl.setAttribute).toBeCalledWith('title', 'Toggle VR display');
        });

        test('should add CSS_CLASS_HIDDEN to .vrButtonEl', () => {
            expect(vrButtonEl.classList.add).toBeCalledWith(CSS_CLASS_HIDDEN);
        });

        test('should create a span and add it to .vrButtonEl', () => {
            expect(document.createElement).toBeCalledWith('span');
            expect(vrButtonEl.appendChild).toBeCalledWith(iconSpanEl);
        });

        test('should set the .innerHtml of the span inside of .vrButtonEl to that of the ICON_3D_VR', () => {
            expect(iconSpanEl.innerHTML).toBe(ICON_3D_VR);
        });
    });

    describe('attachEventHandlers()', () => {
        test('should invoke .vrButtonEl.addEventListener() with args ["click", .handleToggleVr()]', () => {
            jest.spyOn(Video360Controls.prototype, 'addUi');
            const vrButton = {
                addEventListener: jest.fn(),
            };
            controls.vrButtonEl = vrButton;

            controls.attachEventHandlers();
            expect(vrButton.addEventListener).toBeCalledWith('click', controls.handleToggleVr);

            controls.vrButtonEl = null;
        });
    });

    describe('detachEventHandlers()', () => {
        test('should invoke .vrButtonEl.removeEventListener() with args ["click", .handleToggleVr()]', () => {
            jest.spyOn(Video360Controls.prototype, 'addUi');
            const vrButton = {
                removeEventListener: jest.fn(),
            };
            controls.vrButtonEl = vrButton;

            controls.detachEventHandlers();
            expect(vrButton.removeEventListener).toBeCalledWith('click', controls.handleToggleVr);

            controls.vrButtonEl = null;
        });
    });

    describe('handleToggleVr()', () => {
        test('should invoke .emit() with argument EVENT_TOGGLE_VR', () => {
            jest.spyOn(Video360Controls.prototype, 'addUi');
            jest.spyOn(Video360Controls.prototype, 'attachEventHandlers');
            jest.spyOn(Video360Controls.prototype, 'emit');

            controls.handleToggleVr();
            expect(controls.emit).toBeCalledWith(EVENT_TOGGLE_VR);
        });
    });

    describe('showVrButton()', () => {
        test('should invoke .vrButtonEl.classList.remove() with CSS_CLASS_HIDDEN', () => {
            jest.spyOn(Video360Controls.prototype, 'addUi');
            jest.spyOn(Video360Controls.prototype, 'attachEventHandlers');
            const vrButton = {
                classList: {
                    remove: jest.fn(),
                },
            };
            controls.vrButtonEl = vrButton;

            controls.showVrButton();

            expect(vrButton.classList.remove).toBeCalledWith(CSS_CLASS_HIDDEN);
            controls.vrButtonEl = null;
        });
    });

    describe('destroy()', () => {
        beforeEach(() => {
            jest.spyOn(Video360Controls.prototype, 'addUi').mockImplementation();
            jest.spyOn(Video360Controls.prototype, 'attachEventHandlers').mockImplementation();
            jest.spyOn(Video360Controls.prototype, 'removeAllListeners').mockImplementation();
            jest.spyOn(Video360Controls.prototype, 'detachEventHandlers').mockImplementation();
        });

        afterEach(() => {
            controls = null;
        });

        test('should invoke .removeAllListeners()', () => {
            controls.destroy();
            expect(controls.removeAllListeners).toBeCalled();
        });

        test('should invoke .detachEventHandlers()', () => {
            controls.destroy();
            expect(controls.detachEventHandlers).toBeCalled();
        });

        test('should remove .vrButtonEl from control bar, if available and exists in the DOM', () => {
            const parent = {
                removeChild: jest.fn(),
            };
            const vrButton = {
                parentElement: parent,
            };
            controls.vrButtonEl = vrButton;

            controls.destroy();
            expect(parent.removeChild).toBeCalledWith(vrButton);
        });

        test('should nullify .vrButtonEl', () => {
            controls.vrButtonEl = {};
            controls.destroy();

            expect(controls.vrButtonEl).toBeNull();
        });

        test('should nullify .el', () => {
            controls.destroy();

            expect(controls.el).toBeNull();
        });

        test('should nullify .handleToggleVr reference', () => {
            controls.destroy();

            expect(controls.handleToggleVr).toBeNull();
        });
    });
});
