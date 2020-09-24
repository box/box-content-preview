/* eslint-disable no-unused-expressions */
import Settings from '../Settings';
import Browser from '../../../Browser';
import Cache from '../../../Cache';

let settings;
const sandbox = sinon.createSandbox();

describe('lib/viewers/media/Settings', () => {
    beforeEach(() => {
        fixture.load('viewers/media/__tests__/Settings-test.html');
        jest.spyOn(Browser, 'isMobile').mockReturnValue(true);
        settings = new Settings(document.querySelector('.container'), {
            set: () => {},
            has: () => {},
            get: () => {},
            unset: () => {},
        });
    });

    afterEach(() => {
        sandbox.verifyAndRestore();

        if (typeof settings.destroy === 'function') {
            settings.destroy();
            settings = null;
        }
    });

    describe('Settings()', () => {
        test('should have its template set up', () => {
            expect(settings.settingsEl).toHaveClass('bp-media-settings');
            expect(settings.settingsEl).toContainSelector('.bp-media-settings-item');
        });

        test('should initialize as invisible and without subtitles', () => {
            expect(settings.visible).toBe(false);
            expect(settings.hasSubtitles()).toBe(false);
            expect(settings.areSubtitlesOn()).toBe(false);
            expect(settings.containerEl).toHaveClass('bp-media-settings-subtitles-unavailable');
        });

        test('should hide the autoplay option if on mobile', () => {
            expect(settings.containerEl.classList.contains('bp-media-settings-autoplay-unavailable')).toBe(true);
        });
    });

    describe('MEDIA_SPEEDS', () => {
        test('should be aligned with speed options in template', () => {
            const speedElements = [...document.querySelectorAll('.bp-media-settings-sub-item[data-type="speed"]')];
            const dataValues = speedElements.map(elem => elem.getAttribute('data-value'));
            const mediaSpeeds = settings.getMediaSpeeds();
            expect(mediaSpeeds).toEqual(dataValues);
        });
    });

    describe('increaseSpeed()', () => {
        test('should increase speed one step', () => {
            jest.spyOn(settings, 'chooseOption');
            sandbox
                .stub(settings.cache, 'get')
                .withArgs('media-speed')
                .returns('1.25');

            settings.increaseSpeed();

            expect(settings.chooseOption).toBeCalledWith('speed', '1.5');
        });

        test('should not increase speed after max', () => {
            jest.spyOn(settings, 'chooseOption');
            sandbox
                .stub(settings.cache, 'get')
                .withArgs('media-speed')
                .returns('2.0');

            settings.increaseSpeed();

            expect(settings.chooseOption).not.toBeCalled();
        });
    });

    describe('decreaseSpeed()', () => {
        test('should decrease speed one step', () => {
            jest.spyOn(settings, 'chooseOption');
            sandbox
                .stub(settings.cache, 'get')
                .withArgs('media-speed')
                .returns('1.5');

            settings.decreaseSpeed();

            expect(settings.chooseOption).toBeCalledWith('speed', '1.25');
        });

        test('should not decrease speed after min', () => {
            const speedOptions = settings.getMediaSpeeds();
            expect(speedOptions.length).toBeGreaterThan(0);

            jest.spyOn(settings, 'chooseOption');
            sandbox
                .stub(settings.cache, 'get')
                .withArgs('media-speed')
                .returns(speedOptions[0]);

            settings.decreaseSpeed();

            expect(settings.chooseOption).not.toBeCalled();
        });
    });

    describe('setMenuContainerDimensions', () => {
        test('should add padding to settingsEl based on menu contents and additional padding', () => {
            const menuEl = document.createElement('div');
            menuEl.appendChild(document.createElement('span'));
            settings.setMenuContainerDimensions(menuEl);

            expect(settings.settingsEl.style.width).toBe('18px');
        });

        test('should add extra padding to settingsEl based on menu contents that require scroll bar', () => {
            const menuEl = {
                getBoundingClientRect: () => ({
                    width: 0,
                    height: 500, // 210 is max height of settings menu
                }),
            };
            settings.setMenuContainerDimensions(menuEl);

            expect(settings.settingsEl.style.width).toBe('32px');
        });

        test('should grow the height of the settingsEl to that of the sub-menu, with padding', () => {
            const MENU_PADDING = 18;
            const MENU_HEIGHT = 20;
            const menuEl = {
                getBoundingClientRect: () => ({
                    width: 0,
                    height: MENU_HEIGHT,
                }),
            };
            settings.setMenuContainerDimensions(menuEl);

            expect(settings.settingsEl.style.height).toBe(`${MENU_HEIGHT + MENU_PADDING}px`);
        });
    });

    describe('destroy()', () => {
        test('should remove event listeners on settings element and document', () => {
            jest.spyOn(settings.settingsEl, 'removeEventListener');
            jest.spyOn(document, 'removeEventListener');

            settings.destroy();

            expect(settings.settingsEl.removeEventListener).toBeCalledWith('click', settings.menuEventHandler);
            expect(settings.settingsEl.removeEventListener).toBeCalledWith('keydown', settings.menuEventHandler);
            expect(document.removeEventListener).toBeCalledWith('click', settings.blurHandler);
        });
    });

    describe('init()', () => {
        test('should set the initial quality and speed', () => {
            jest.spyOn(settings, 'chooseOption');
            const quality = 'sd';
            const speed = '2.0';
            const autoplay = 'Enabled';

            settings.cache = new Cache();
            settings.cache.cache['media-quality'] = quality;
            settings.cache.cache['media-speed'] = speed;
            settings.cache.cache['media-autoplay'] = autoplay;

            settings.init();

            expect(settings.chooseOption).toBeCalledWith('quality', quality, false);
            expect(settings.chooseOption).toBeCalledWith('speed', speed);
            expect(settings.chooseOption).toBeCalledWith('autoplay', autoplay);
        });
    });

    describe('reset()', () => {
        test('should reset the classes for the settings element', () => {
            settings.settingsEl.className = 'blah';

            settings.reset();

            expect(settings.settingsEl).toHaveClass('bp-media-settings');
        });

        test('should reset the menu container dimensions', () => {
            const mainMenu = settings.settingsEl.querySelector('.bp-media-settings-menu-main');
            jest.spyOn(settings, 'setMenuContainerDimensions');

            settings.reset();

            expect(settings.setMenuContainerDimensions).toBeCalledWith(mainMenu);
        });
    });

    describe('findParentDataType()', () => {
        test('should find the parent node with a data type', () => {
            let target = document.querySelector('.bp-media-settings-label');
            expect(settings.findParentDataType(target)).toHaveClass('bp-media-settings-item');

            target = document.querySelector('.blah');
            expect(settings.findParentDataType(target)).toBeNull();
        });
    });

    describe('menuEventHandler() select', () => {
        beforeEach(() => {
            jest.spyOn(settings, 'reset').mockImplementation();
            jest.spyOn(settings, 'chooseOption').mockImplementation();
            jest.spyOn(settings, 'showSubMenu').mockImplementation();
        });

        test('should not do anything if not in the settings element', () => {
            jest.spyOn(settings, 'findParentDataType').mockReturnValue(null);

            settings.menuEventHandler({ type: 'click' });

            expect(settings.reset).not.toBeCalled();
            expect(settings.chooseOption).not.toBeCalled();
            expect(settings.settingsEl.className).toBe('bp-media-settings');
        });

        test('should reset menu and focus first element on click on menu data-type', () => {
            jest.spyOn(settings, 'findParentDataType').mockReturnValue(document.querySelector('[data-type="menu"]'));

            settings.menuEventHandler({ type: 'click' });
            settings.settingsEl.classList.remove('bp-media-settings-in-transition'); // simulate transition end

            expect(settings.reset).toBeCalled();
            expect(settings.chooseOption).not.toBeCalled();
            expect(settings.settingsEl.className).toBe('bp-media-settings');
            expect(settings.firstMenuItem).toHaveFocus();
        });

        test('should reset menu and focus first element on Space on menu data-type', () => {
            jest.spyOn(settings, 'findParentDataType').mockReturnValue(document.querySelector('[data-type="menu"]'));
            const event = {
                type: 'keydown',
                key: 'Space',
                preventDefault: jest.fn(),
                stopPropagation: jest.fn(),
            };

            settings.menuEventHandler(event);
            settings.settingsEl.classList.remove('bp-media-settings-in-transition'); // simulate transition end

            expect(settings.reset).toBeCalled();
            expect(settings.chooseOption).not.toBeCalled();
            expect(settings.settingsEl.className).toBe('bp-media-settings');
            expect(settings.firstMenuItem).toHaveFocus();
            expect(event.preventDefault).toBeCalled();
            expect(event.stopPropagation).toBeCalled();
            expect(settings.containerEl).toHaveClass('bp-has-keyboard-focus');
        });

        test('should reset menu and focus first element on Enter on menu data-type', () => {
            jest.spyOn(settings, 'findParentDataType').mockReturnValue(document.querySelector('[data-type="menu"]'));
            const event = {
                type: 'keydown',
                key: 'Enter',
                preventDefault: jest.fn(),
                stopPropagation: jest.fn(),
            };

            settings.menuEventHandler(event);
            settings.settingsEl.classList.remove('bp-media-settings-in-transition'); // simulate transition end

            expect(settings.reset).toBeCalled();
            expect(settings.chooseOption).not.toBeCalled();
            expect(settings.settingsEl.className).toBe('bp-media-settings');
            expect(settings.firstMenuItem).toHaveFocus();
            expect(event.preventDefault).toBeCalled();
            expect(event.stopPropagation).toBeCalled();
            expect(settings.containerEl).toHaveClass('bp-has-keyboard-focus');
        });

        test('should choose option, focus first element, and reset menu on click on sub menu option', () => {
            jest.spyOn(settings, 'findParentDataType').mockReturnValue(
                document.querySelector('[data-type="speed"][data-value="2.0"]'),
            );
            settings.menuEventHandler({ type: 'click' });
            settings.settingsEl.classList.remove('bp-media-settings-in-transition'); // simulate transition end

            expect(settings.reset).not.toBeCalled();
            expect(settings.chooseOption).toBeCalledWith('speed', '2.0');
            expect(settings.settingsEl.className).toBe('bp-media-settings');
            expect(settings.firstMenuItem).toHaveFocus();
        });

        test('should choose option, focus first element, and reset menu on Space on sub menu option', () => {
            jest.spyOn(settings, 'findParentDataType').mockReturnValue(
                document.querySelector('[data-type="speed"][data-value="2.0"]'),
            );
            const event = {
                type: 'keydown',
                key: 'Space',
                preventDefault: jest.fn(),
                stopPropagation: jest.fn(),
            };
            settings.menuEventHandler(event);
            settings.settingsEl.classList.remove('bp-media-settings-in-transition'); // simulate transition end

            expect(settings.reset).not.toBeCalled();
            expect(settings.chooseOption).toBeCalledWith('speed', '2.0');
            expect(settings.settingsEl.className).toBe('bp-media-settings');
            expect(settings.firstMenuItem).toHaveFocus();
            expect(event.preventDefault).toBeCalled();
            expect(event.stopPropagation).toBeCalled();
            expect(settings.containerEl).toHaveClass('bp-has-keyboard-focus');
        });

        test('should choose option, focus first element, and reset menu on Enter on sub menu option', () => {
            jest.spyOn(settings, 'findParentDataType').mockReturnValue(
                document.querySelector('[data-type="speed"][data-value="2.0"]'),
            );
            const event = {
                type: 'keydown',
                key: 'Enter',
                preventDefault: jest.fn(),
                stopPropagation: jest.fn(),
            };
            settings.menuEventHandler(event);
            settings.settingsEl.classList.remove('bp-media-settings-in-transition'); // simulate transition end

            expect(settings.reset).not.toBeCalled();
            expect(settings.chooseOption).toBeCalledWith('speed', '2.0');
            expect(settings.settingsEl.className).toBe('bp-media-settings');
            expect(settings.firstMenuItem).toHaveFocus();
            expect(event.preventDefault).toBeCalled();
            expect(event.stopPropagation).toBeCalled();
            expect(settings.containerEl).toHaveClass('bp-has-keyboard-focus');
        });

        test('should go to sub menu on click on an option on main menu', () => {
            // Starting from the main menu
            jest.spyOn(settings, 'findParentDataType').mockReturnValue(
                document.querySelector('.bp-media-settings-item-speed'),
            );

            settings.menuEventHandler({ type: 'click' });

            expect(settings.reset).not.toBeCalled();
            expect(settings.showSubMenu).toBeCalledWith('speed');
        });

        test('should go to sub menu on Space on an option on main menu', () => {
            // Starting from the main menu
            jest.spyOn(settings, 'findParentDataType').mockReturnValue(
                document.querySelector('.bp-media-settings-item-speed'),
            );
            const event = {
                type: 'keydown',
                key: 'Space',
                preventDefault: jest.fn(),
                stopPropagation: jest.fn(),
            };

            settings.menuEventHandler(event);

            expect(settings.reset).not.toBeCalled();
            expect(settings.showSubMenu).toBeCalledWith('speed');
            expect(event.preventDefault).toBeCalled();
            expect(event.stopPropagation).toBeCalled();
            expect(settings.containerEl).toHaveClass('bp-has-keyboard-focus');
        });

        test('should go to sub menu on Enter on an option on main menu', () => {
            // Starting from the main menu
            jest.spyOn(settings, 'findParentDataType').mockReturnValue(
                document.querySelector('.bp-media-settings-item-speed'),
            );
            const event = {
                type: 'keydown',
                key: 'Enter',
                preventDefault: jest.fn(),
                stopPropagation: jest.fn(),
            };

            settings.menuEventHandler(event);

            expect(settings.reset).not.toBeCalled();
            expect(settings.showSubMenu).toBeCalledWith('speed');
            expect(event.preventDefault).toBeCalled();
            expect(event.stopPropagation).toBeCalled();
            expect(settings.containerEl).toHaveClass('bp-has-keyboard-focus');
        });
    });

    describe('menuEventHandler() navigate', () => {
        beforeEach(() => {
            jest.spyOn(settings, 'reset').mockImplementation();
            jest.spyOn(settings, 'showSubMenu').mockImplementation();
        });

        test('should go up on arrowup', () => {
            // Starting from the quality item in the main menu
            jest.spyOn(settings, 'findParentDataType').mockReturnValue(
                document.querySelector('.bp-media-settings-item-quality'),
            );
            const event = {
                type: 'keydown',
                key: 'ArrowUp',
                preventDefault: jest.fn(),
                stopPropagation: jest.fn(),
            };

            settings.menuEventHandler(event);

            expect(document.querySelector('.bp-media-settings-item-speed')).toHaveFocus();
            expect(settings.reset).not.toBeCalled();
            expect(settings.showSubMenu).not.toBeCalled();
            expect(event.preventDefault).toBeCalled();
            expect(event.stopPropagation).toBeCalled();
            expect(settings.containerEl).toHaveClass('bp-has-keyboard-focus');
        });

        test('should do nothing on arrowup except add keyboard-focus class if already at top item', () => {
            // Starting from the speed item in the main menu
            jest.spyOn(settings, 'findParentDataType').mockReturnValue(
                document.querySelector('.bp-media-settings-item-speed'),
            );
            const event = {
                type: 'keydown',
                key: 'ArrowUp',
                preventDefault: jest.fn(),
                stopPropagation: jest.fn(),
            };

            settings.menuEventHandler(event);

            expect(settings.reset).not.toBeCalled();
            expect(settings.showSubMenu).not.toBeCalled();
            expect(event.preventDefault).toBeCalled();
            expect(event.stopPropagation).toBeCalled();
            expect(settings.containerEl).toHaveClass('bp-has-keyboard-focus');
        });

        test('should go down on arrowdown', () => {
            // Starting from the speed item in the main menu
            jest.spyOn(settings, 'findParentDataType').mockReturnValue(
                document.querySelector('.bp-media-settings-item-speed'),
            );
            const event = {
                type: 'keydown',
                key: 'ArrowDown',
                preventDefault: jest.fn(),
                stopPropagation: jest.fn(),
            };

            settings.menuEventHandler(event);

            expect(document.querySelector('.bp-media-settings-item-quality')).toHaveFocus();
            expect(settings.reset).not.toBeCalled();
            expect(settings.showSubMenu).not.toBeCalled();
            expect(event.preventDefault).toBeCalled();
            expect(event.stopPropagation).toBeCalled();
            expect(settings.containerEl).toHaveClass('bp-has-keyboard-focus');
        });

        test('should do nothing on arrowdown except add keyboard-focus class if already at bottom item', () => {
            // Starting from the quality item in the main menu
            jest.spyOn(settings, 'findParentDataType').mockReturnValue(
                document.querySelector('.bp-media-settings-item-quality'),
            );
            const event = {
                type: 'keydown',
                key: 'ArrowDown',
                preventDefault: jest.fn(),
                stopPropagation: jest.fn(),
            };

            settings.menuEventHandler(event);

            expect(settings.reset).not.toBeCalled();
            expect(settings.showSubMenu).not.toBeCalled();
            expect(event.preventDefault).toBeCalled();
            expect(event.stopPropagation).toBeCalled();
            expect(settings.containerEl).toHaveClass('bp-has-keyboard-focus');
        });

        test('should go to main menu on arrowleft if on sub menu', () => {
            // Starting from sub menu
            jest.spyOn(settings, 'findParentDataType').mockReturnValue(
                document.querySelector('.bp-media-settings-selected[data-type="speed"]'),
            );
            const event = {
                type: 'keydown',
                key: 'ArrowLeft',
                preventDefault: jest.fn(),
                stopPropagation: jest.fn(),
            };

            settings.menuEventHandler(event);

            expect(settings.reset).toBeCalled();
            expect(settings.firstMenuItem).toHaveFocus();
            expect(settings.showSubMenu).not.toBeCalled();
            expect(event.preventDefault).toBeCalled();
            expect(event.stopPropagation).toBeCalled();
        });

        test('should do nothing on arrowleft if on main menu', () => {
            // Starting from the main menu
            jest.spyOn(settings, 'findParentDataType').mockReturnValue(
                document.querySelector('.bp-media-settings-item-speed'),
            );
            const event = {
                type: 'keydown',
                key: 'ArrowLeft',
                preventDefault: jest.fn(),
                stopPropagation: jest.fn(),
            };

            settings.menuEventHandler(event);

            expect(settings.reset).not.toBeCalled();
            expect(settings.firstMenuItem).toHaveFocus();
            expect(settings.showSubMenu).not.toBeCalled();
            expect(event.preventDefault).toBeCalled();
            expect(event.stopPropagation).toBeCalled();
        });

        test('should go to speed sub menu on arrowright if on speed main menu item', () => {
            // Starting from the speed menu item
            jest.spyOn(settings, 'findParentDataType').mockReturnValue(
                document.querySelector('.bp-media-settings-item-speed'),
            );
            const event = {
                type: 'keydown',
                key: 'ArrowRight',
                preventDefault: jest.fn(),
                stopPropagation: jest.fn(),
            };

            settings.menuEventHandler(event);

            expect(settings.reset).not.toBeCalled();
            expect(settings.showSubMenu).toBeCalledWith('speed');
            expect(event.preventDefault).toBeCalled();
            expect(event.stopPropagation).toBeCalled();
        });

        test('should do nothing on arrowright if on sub menu', () => {
            // Starting from the sub menu
            jest.spyOn(settings, 'findParentDataType').mockReturnValue(
                document.querySelector('.bp-media-settings-selected[data-type="speed"]'),
            );
            const event = {
                type: 'keydown',
                key: 'ArrowRight',
                preventDefault: jest.fn(),
                stopPropagation: jest.fn(),
            };

            settings.menuEventHandler(event);

            expect(settings.reset).not.toBeCalled();
            expect(settings.showSubMenu).not.toBeCalled();
            expect(event.preventDefault).toBeCalled();
            expect(event.stopPropagation).toBeCalled();
        });

        test('should go to quality sub menu on arrowright if on quality main menu item', () => {
            // Starting from the quality menu item
            jest.spyOn(settings, 'findParentDataType').mockReturnValue(
                document.querySelector('.bp-media-settings-item-quality'),
            );
            const event = {
                type: 'keydown',
                key: 'ArrowRight',
                preventDefault: jest.fn(),
                stopPropagation: jest.fn(),
            };

            settings.menuEventHandler(event);

            expect(settings.reset).not.toBeCalled();
            expect(settings.showSubMenu).toBeCalledWith('quality');
            expect(event.preventDefault).toBeCalled();
            expect(event.stopPropagation).toBeCalled();
        });

        test('should hide menu and restore focus to settings button on escape', () => {
            jest.spyOn(settings, 'hide');
            // Starting from the main menu
            jest.spyOn(settings, 'findParentDataType').mockReturnValue(
                document.querySelector('.bp-media-settings-item-speed'),
            );
            const event = {
                type: 'keydown',
                key: 'Escape',
                preventDefault: jest.fn(),
                stopPropagation: jest.fn(),
            };

            settings.menuEventHandler(event);

            expect(settings.hide).toBeCalled();
            expect(settings.settingsButtonEl).toHaveFocus();
            expect(event.preventDefault).toBeCalled();
            expect(event.stopPropagation).toBeCalled();
        });
    });

    describe('handleTransitionEnd', () => {
        test('should remove in transition class', () => {
            settings.settingsEl.classList.add('bp-media-settings-in-transition');
            settings.handleTransitionEnd();
            expect(settings.settingsEl).not.toHaveClass('bp-media-settings-in-transition');
        });
    });

    describe('showSubMenu()', () => {
        test('should do nothing if the sub menu is disabled', () => {
            jest.spyOn(settings, 'setMenuContainerDimensions');
            settings.showSubMenu('quality');
            expect(settings.setMenuContainerDimensions).not.toBeCalled();
        });

        test('should show the speed submenu if speed is selected', () => {
            settings.showSubMenu('speed');
            expect(settings.settingsEl).toHaveClass('bp-media-settings-show-speed');
        });

        test('should show the quality submenu if quality is selected', () => {
            settings.enableHD();
            settings.showSubMenu('quality');
            expect(settings.settingsEl).toHaveClass('bp-media-settings-show-quality');
        });

        test('should focus on the currently selected value', () => {
            // Select a different speed for testing purposes
            const prevSelected = settings.settingsEl.querySelector(
                '[data-type="speed"].bp-media-settings-sub-item.bp-media-settings-selected',
            );
            prevSelected.classList.remove('bp-media-settings-selected');
            const selected = settings.settingsEl.querySelector('[data-value="1.25"]');
            selected.classList.add('bp-media-settings-selected');

            settings.showSubMenu('speed');

            expect(selected).toHaveFocus();
        });

        test('should recompute the menu container dimensions', () => {
            jest.spyOn(settings, 'setMenuContainerDimensions');

            settings.showSubMenu('speed');

            expect(settings.setMenuContainerDimensions).toBeCalled();
        });
    });

    describe('menuItemSelect()', () => {
        let menuItem;

        beforeEach(() => {
            menuItem = document.createElement('div');
            menuItem.setAttribute('data-type', 'someOption');
            menuItem.setAttribute('data-value', 'someValue');

            jest.spyOn(settings, 'reset').mockImplementation();
            jest.spyOn(settings, 'chooseOption').mockImplementation();
            jest.spyOn(settings, 'showSubMenu').mockImplementation();

            settings.firstMenuItem = {
                focus: jest.fn(),
            };
        });

        test('should add menu settings in transition class', () => {
            settings.menuItemSelect(menuItem);
            expect(settings.settingsEl).toHaveClass('bp-media-settings-in-transition');
        });

        test('should reset and focus first menu item if selected item is the option to return to menu', () => {
            menuItem.setAttribute('data-type', 'menu');

            settings.menuItemSelect(menuItem);
            expect(settings.reset).toBeCalled();
            expect(settings.firstMenuItem.focus).toBeCalled();
        });

        test('should choose option if an menu option with a type and value are selected', () => {
            settings.menuItemSelect(menuItem);
            expect(settings.chooseOption).toBeCalledWith('someOption', 'someValue');
        });

        test('should show sub menu if selected option is a sub menu option', () => {
            const optionType = 'submenu';
            menuItem.setAttribute('data-type', optionType);
            menuItem.setAttribute('data-value', '');

            settings.menuItemSelect(menuItem);
            expect(settings.showSubMenu).toBeCalledWith(optionType);
        });
    });

    describe('chooseOption()', () => {
        test('should reset the menu and focus, cache option, and emit chosen option', () => {
            jest.spyOn(settings, 'reset').mockImplementation();
            jest.spyOn(settings, 'emit').mockImplementation();
            jest.spyOn(settings.cache, 'set').mockImplementation();

            const type = 'speed';
            const value = 0.5;
            settings.chooseOption(type, value);

            expect(settings.cache.set).toBeCalledWith(`media-${type}`, value, true);
            expect(settings.emit).toBeCalledWith(type);
            expect(settings.reset).toBeCalled();
            expect(settings.firstMenuItem).toHaveFocus();
        });

        test('should set the option value on the top menu and update the checkmark', () => {
            settings.chooseOption('speed', 0.5);

            expect(document.querySelector('[data-type="speed"] .bp-media-settings-value').textContent).toBe('0.5');
            expect(document.querySelector('[data-type="speed"][data-value="1.0"]')).not.toHaveClass(
                'bp-media-settings-selected',
            );
            expect(document.querySelector('[data-type="speed"][data-value="0.5"]')).toHaveClass(
                'bp-media-settings-selected',
            );
        });

        test('should do special handling for subtitles', () => {
            jest.spyOn(settings, 'handleSubtitleSelection');

            settings.chooseOption('subtitles', '-1');

            expect(settings.handleSubtitleSelection).toBeCalled();
        });

        test('should not do special subtitle handling for non-subtitles', () => {
            jest.spyOn(settings, 'handleSubtitleSelection');

            settings.chooseOption('speed', 0.5);

            expect(settings.handleSubtitleSelection).not.toBeCalled();
        });

        test('should not not set the cache if setCache is set to false', () => {
            jest.spyOn(settings, 'handleSubtitleSelection');
            jest.spyOn(settings.cache, 'set');

            settings.chooseOption('speed', 0.5, false);

            expect(settings.cache.set).not.toBeCalled();
        });
    });

    describe('handleSubtitleSelection()', () => {
        test('should save previous value when turning off subtitles', () => {
            settings.toggleToSubtitle = '2';
            settings.handleSubtitleSelection('3', '-1');

            expect(settings.toggleToSubtitle).toBe('3');
            expect(settings.areSubtitlesOn()).toBe(false);
            expect(settings.ccButtonEl.getAttribute('aria-pressed')).toBe('false');
            expect(settings.containerEl).not.toHaveClass('bp-media-settings-subtitles-on');
        });

        test('should NOT save old value when turning off subtitles if subtitles were already off', () => {
            settings.toggleToSubtitle = '2';
            settings.handleSubtitleSelection('-1', '-1');

            expect(settings.toggleToSubtitle).toBe('2');
            expect(settings.areSubtitlesOn()).toBe(false);
            expect(settings.ccButtonEl.getAttribute('aria-pressed')).toBe('false');
            expect(settings.containerEl).not.toHaveClass('bp-media-settings-subtitles-on');
        });

        test('should set subtitles-on on container when subtitles are selected', () => {
            settings.handleSubtitleSelection('-1', '2');

            expect(settings.ccButtonEl.getAttribute('aria-pressed')).toBe('true');
            expect(settings.containerEl).toHaveClass('bp-media-settings-subtitles-on');
        });
    });

    describe('toggleSubtitles()', () => {
        beforeEach(() => {
            jest.spyOn(settings, 'chooseOption').mockImplementation();
        });

        test('Should turn off subtitles if they were previously on', () => {
            jest.spyOn(settings, 'hasSubtitles').mockReturnValue(true);
            jest.spyOn(settings, 'areSubtitlesOn').mockReturnValue(true);

            settings.toggleSubtitles();

            expect(settings.chooseOption).toBeCalledWith('subtitles', '-1');
        });

        test('Should turn on subtitles if they were previously off', () => {
            jest.spyOn(settings, 'hasSubtitles').mockReturnValue(true);
            jest.spyOn(settings, 'areSubtitlesOn').mockReturnValue(false);
            settings.toggleToSubtitle = '2';

            settings.toggleSubtitles();

            expect(settings.chooseOption).toBeCalledWith('subtitles', '2');
        });

        test('Should prefer subtitle matching previewer language/locale', () => {
            jest.spyOn(settings, 'hasSubtitles').mockReturnValue(true);
            jest.spyOn(settings, 'areSubtitlesOn').mockReturnValue(false);
            settings.subtitles = ['English', 'Spanish', 'Russian', 'French'];
            settings.language = 'Spanish';

            settings.toggleSubtitles();

            expect(settings.chooseOption).toBeCalledWith('subtitles', '1');
        });

        test('Should prefer English subtitle if previewer language not in list', () => {
            jest.spyOn(settings, 'hasSubtitles').mockReturnValue(true);
            jest.spyOn(settings, 'areSubtitlesOn').mockReturnValue(false);
            settings.subtitles = ['Spanish', 'Russian', 'English', 'French'];
            settings.language = 'Mongolian';

            settings.toggleSubtitles();

            expect(settings.chooseOption).toBeCalledWith('subtitles', '2');
        });

        test('Should prefer first subtitle in list if previewer language not in list and English absent', () => {
            jest.spyOn(settings, 'hasSubtitles').mockReturnValue(true);
            jest.spyOn(settings, 'areSubtitlesOn').mockReturnValue(false);
            settings.subtitles = ['Spanish', 'Russian', 'French'];
            settings.language = 'Mongolian';

            settings.toggleSubtitles();

            expect(settings.chooseOption).toBeCalledWith('subtitles', '0');
        });
    });

    describe('loadSubtitles()', () => {
        test('Should load all subtitles and make them available', () => {
            const subsMenu = settings.settingsEl.querySelector('.bp-media-settings-menu-subtitles');

            settings.loadSubtitles(['English', 'Russian', 'Spanish']);

            expect(subsMenu.children.length).toBe(5);
            expect(settings.hasSubtitles()).toBe(true);
            expect(settings.containerEl).not.toHaveClass('bp-media-settings-subtitles-unavailable');
        });

        test('Should reset menu dimensions after loading', () => {
            jest.spyOn(settings, 'setMenuContainerDimensions');

            settings.loadSubtitles(['English', 'Russian', 'Spanish']);

            expect(settings.setMenuContainerDimensions).toBeCalledWith(settings.settingsEl.firstChild);
        });

        test('Should toggle on subtitles if they were on in the most recently viewed subtitled video', () => {
            jest.spyOn(settings, 'chooseOption');
            jest.spyOn(settings, 'areSubtitlesOn').mockReturnValue(false);
            sandbox
                .stub(settings.cache, 'get')
                .withArgs('media-subtitles')
                .returns('2');

            settings.loadSubtitles(['English', 'Russian', 'Spanish']);

            expect(settings.chooseOption).toBeCalledWith('subtitles', '0');
        });

        test('Should not toggle on subtitles if they were off in the most recently viewed subtitled video', () => {
            jest.spyOn(settings, 'chooseOption');
            jest.spyOn(settings, 'areSubtitlesOn').mockReturnValue(false);
            sandbox
                .stub(settings.cache, 'get')
                .withArgs('media-subtitles')
                .returns('-1');

            settings.loadSubtitles(['English', 'Russian', 'Spanish']);

            expect(settings.chooseOption).not.toBeCalled();
        });

        test('Should escape subtitle names', () => {
            const subsMenu = settings.settingsEl.querySelector('.bp-media-settings-menu-subtitles');

            settings.loadSubtitles(['English', '<badboy>']);

            const sub0 = subsMenu.querySelector('[data-value="0"]').querySelector('.bp-media-settings-value');
            const sub1 = subsMenu.querySelector('[data-value="1"]').querySelector('.bp-media-settings-value');
            expect(sub0.innerHTML).toBe('English');
            expect(sub1.innerHTML).toBe('&lt;badboy&gt;');
        });
    });

    describe('loadAlternateAudio()', () => {
        test('Should load all audio tracks and make them available', () => {
            const audioMenu = settings.settingsEl.querySelector('.bp-media-settings-menu-audiotracks');
            jest.spyOn(settings, 'chooseOption');

            settings.loadAlternateAudio(['English', 'Russian', 'Spanish']);

            expect(settings.chooseOption).toBeCalledWith('audiotracks', '0');
            expect(audioMenu.children.length).toBe(4);
            expect(settings.containerEl).not.toHaveClass('bp-media-settings-audiotracks-unavailable');
        });

        test('Should reset menu dimensions after loading', () => {
            jest.spyOn(settings, 'setMenuContainerDimensions');

            settings.loadAlternateAudio(['English', 'Russian', 'Spanish']);

            expect(settings.setMenuContainerDimensions).toBeCalledWith(settings.settingsEl.firstChild);
        });

        test('Should not list language for "und" language code', () => {
            const audioMenu = settings.settingsEl.querySelector('.bp-media-settings-menu-audiotracks');

            settings.loadAlternateAudio(['English', 'und']);

            const audio0 = audioMenu.querySelector('[data-value="0"]').querySelector('.bp-media-settings-value');
            const audio1 = audioMenu.querySelector('[data-value="1"]').querySelector('.bp-media-settings-value');
            expect(audio0.innerHTML).toBe('Track 1 (English)');
            expect(audio1.innerHTML).toBe('Track 2');
        });

        test('Should escape audio languages and roles', () => {
            const audioMenu = settings.settingsEl.querySelector('.bp-media-settings-menu-audiotracks');

            // There shouldn't be a way to get such inputs into this method in normal use case anyway
            // because it goes through multiple levels of sanitization, but just in case...
            settings.loadAlternateAudio(['English', '<badboy>']);

            const audio0 = audioMenu.querySelector('[data-value="0"]').querySelector('.bp-media-settings-value');
            const audio1 = audioMenu.querySelector('[data-value="1"]').querySelector('.bp-media-settings-value');
            expect(audio0.innerHTML).toBe('Track 1 (English)');
            expect(audio1.innerHTML).toBe('Track 2 (&lt;badboy&gt;)');
        });
    });

    describe('hasSubtitles()', () => {
        test('Should be false before loading subtitles', () => {
            expect(settings.hasSubtitles()).toBe(false);
        });

        test('Should be true after loading subtitles', () => {
            settings.loadSubtitles(['English']);

            expect(settings.hasSubtitles()).toBe(true);
        });
    });

    describe('blurHandler()', () => {
        test('should hide if click is outside of settings element', () => {
            jest.spyOn(settings, 'hide');

            settings.blurHandler({ type: 'click', target: settings.containerEl });

            expect(settings.hide).toBeCalled();
        });

        test('should hide if space is pressed outside of settings element', () => {
            jest.spyOn(settings, 'hide');

            settings.blurHandler({ type: 'keydown', key: 'Space', target: settings.containerEl });

            expect(settings.hide).toBeCalled();
        });

        test('should hide if enter is pressed outside of settings element', () => {
            jest.spyOn(settings, 'hide');

            settings.blurHandler({ type: 'keydown', key: 'Enter', target: settings.containerEl });

            expect(settings.hide).toBeCalled();
        });

        test('should not hide if click is on settings button', () => {
            jest.spyOn(settings, 'hide');

            settings.blurHandler({ type: 'click', target: document.querySelector('.bp-media-gear-icon') });

            expect(settings.hide).not.toBeCalled();
        });

        test('should not hide if space is pressed on settings button', () => {
            jest.spyOn(settings, 'hide');

            settings.blurHandler({
                type: 'keydown',
                key: 'Space',
                target: document.querySelector('.bp-media-gear-icon'),
            });

            expect(settings.hide).not.toBeCalled();
        });

        test('should not hide if enter is pressed on settings button', () => {
            jest.spyOn(settings, 'hide');

            settings.blurHandler({
                type: 'keydown',
                key: 'Enter',
                target: document.querySelector('.bp-media-gear-icon'),
            });

            expect(settings.hide).not.toBeCalled();
        });

        test('should not hide if click is on settings menu', () => {
            jest.spyOn(settings, 'hide');

            settings.blurHandler({ type: 'click', target: document.querySelector('.bp-media-settings-item') });

            expect(settings.hide).not.toBeCalled();
        });

        test('should not hide if space is pressed on settings button', () => {
            jest.spyOn(settings, 'hide');

            settings.blurHandler({
                type: 'keydown',
                key: 'Space',
                target: document.querySelector('.bp-media-settings-item'),
            });

            expect(settings.hide).not.toBeCalled();
        });

        test('should not hide if enter is pressed on settings button', () => {
            jest.spyOn(settings, 'hide');

            settings.blurHandler({
                type: 'keydown',
                key: 'Enter',
                target: document.querySelector('.bp-media-settings-item'),
            });

            expect(settings.hide).not.toBeCalled();
        });

        test('should hide and stop propagation if escape is pressed outside of settings element', () => {
            jest.spyOn(settings, 'hide');
            const event = {
                type: 'keydown',
                key: 'Escape',
                target: document.querySelector('.bp-media-gear-icon'),
                preventDefault: jest.fn(),
                stopPropagation: jest.fn(),
            };

            settings.blurHandler(event);

            expect(settings.hide).toBeCalled();
            expect(event.preventDefault).toBeCalled();
            expect(event.stopPropagation).toBeCalled();
        });

        test('should not hide if escape is pressed in settings menu', () => {
            jest.spyOn(settings, 'hide');
            const event = {
                type: 'keydown',
                key: 'Escape',
                target: document.querySelector('.bp-media-settings-item'),
                preventDefault: jest.fn(),
                stopPropagation: jest.fn(),
            };

            settings.blurHandler(event);

            expect(settings.hide).not.toBeCalled();
            expect(event.preventDefault).not.toBeCalled();
            expect(event.stopPropagation).not.toBeCalled();
        });
    });

    describe('isVisible()', () => {
        test('should return visible property', () => {
            settings.visible = true;
            expect(settings.isVisible()).toBe(true);

            settings.visible = false;
            expect(settings.isVisible()).toBe(false);
        });
    });

    describe('show()', () => {
        test('should add open class, move focus to first item, and add a blur handler', () => {
            jest.spyOn(document, 'addEventListener');

            settings.show();

            expect(settings.visible).toBe(true);
            expect(settings.containerEl).toHaveClass('bp-media-settings-is-open');
            expect(document.addEventListener).toBeCalledWith('click', settings.blurHandler, true);
            expect(document.addEventListener).toBeCalledWith('keydown', settings.blurHandler, true);
            expect(settings.firstMenuItem).toHaveFocus();
        });
    });

    describe('hide()', () => {
        test('should reset, remove the open class, and remove the blur handler', () => {
            jest.spyOn(settings, 'reset');
            jest.spyOn(document, 'removeEventListener');

            settings.hide();

            expect(settings.reset).toBeCalled();
            expect(settings.containerEl).not.toHaveClass('bp-media-settings-is-open');
            expect(settings.visible).toBe(false);
            expect(document.removeEventListener).toBeCalledWith('click', settings.blurHandler, true);
            expect(document.removeEventListener).toBeCalledWith('keydown', settings.blurHandler, true);
        });
    });

    describe('enableHD()', () => {
        test('should remove the unavailable class, enable the sub menu, and choose the cached quality option', () => {
            jest.spyOn(settings.cache, 'get').mockReturnValue('hd');
            jest.spyOn(settings, 'chooseOption');
            const CLASS_SETTINGS_QUALITY_MENU = 'bp-media-settings-menu-quality';
            const qualitySubMenu = settings.containerEl.querySelector(`.${CLASS_SETTINGS_QUALITY_MENU}`);

            settings.enableHD();

            expect(settings.containerEl.classList.contains('bp-media-settings-hd-unavailable')).toBe(false);
            expect(settings.chooseOption).toBeCalledWith('quality', 'hd');
            expect(qualitySubMenu.getAttribute('data-disabled')).toBe('');
        });
    });
});
