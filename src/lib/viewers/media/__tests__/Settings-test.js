/* eslint-disable no-unused-expressions */
import Settings from '../Settings';
import Browser from '../../../Browser';

let settings;
const sandbox = sinon.sandbox.create();

describe('lib/viewers/media/Settings', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/media/__tests__/Settings-test.html');
        const containerEl = document.querySelector('.container');
        sandbox.stub(Browser, 'isMobile').returns(true);
        settings = new Settings(containerEl, {
            set: () => {},
            has: () => {},
            get: () => {},
            unset: () => {}
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
        it('should have its template set up', () => {
            expect(settings.settingsEl).to.have.class('bp-media-settings');
            expect(settings.settingsEl).to.contain('.bp-media-settings-item');
        });

        it('should initialize as invisible and without subtitles', () => {
            expect(settings.visible).to.be.false;
            expect(settings.hasSubtitles()).to.be.false;
            expect(settings.areSubtitlesOn()).to.be.false;
            expect(settings.containerEl).to.have.class('bp-media-settings-subtitles-unavailable');
        });

        it('should hide the autoplay option if on mobile', () => {
            expect(settings.containerEl.classList.contains('bp-media-settings-autoplay-unavailable')).to.be.true;
        });
    });

    describe('MEDIA_SPEEDS', () => {
        it('should be aligned with speed options in template', () => {
            const speedElements = [...document.querySelectorAll('.bp-media-settings-sub-item[data-type="speed"]')];
            const dataValues = speedElements.map((elem) => elem.getAttribute('data-value'));
            const mediaSpeeds = settings.getMediaSpeeds();
            expect(mediaSpeeds).to.deep.equal(dataValues);
        });
    });

    describe('increaseSpeed()', () => {
        it('should increase speed one step', () => {
            sandbox.stub(settings, 'chooseOption');
            sandbox.stub(settings.cache, 'get').withArgs('media-speed').returns('1.25');

            settings.increaseSpeed();

            expect(settings.chooseOption).to.be.calledWith('speed', '1.5');
        });

        it('should not increase speed after max', () => {
            sandbox.stub(settings, 'chooseOption');
            sandbox.stub(settings.cache, 'get').withArgs('media-speed').returns('2.0');

            settings.increaseSpeed();

            expect(settings.chooseOption).to.not.be.called;
        });
    });

    describe('decreaseSpeed()', () => {
        it('should decrease speed one step', () => {
            sandbox.stub(settings, 'chooseOption');
            sandbox.stub(settings.cache, 'get').withArgs('media-speed').returns('1.5');

            settings.decreaseSpeed();

            expect(settings.chooseOption).to.be.calledWith('speed', '1.25');
        });

        it('should not decrease speed after min', () => {
            const speedOptions = settings.getMediaSpeeds();
            expect(speedOptions.length).to.be.above(0);

            sandbox.stub(settings, 'chooseOption');
            sandbox.stub(settings.cache, 'get').withArgs('media-speed').returns(speedOptions[0]);

            settings.decreaseSpeed();

            expect(settings.chooseOption).to.not.be.called;
        });
    });

    describe('setMenuContainerDimensions', () => {
        it('should add padding to settingsEl based on menu contents and additional padding', () => {
            const menuEl = document.createElement('div');
            menuEl.appendChild(document.createElement('span'));
            settings.setMenuContainerDimensions(menuEl);

            expect(settings.settingsEl.style.width).to.equal('18px');
        });

        it('should add extra padding to settingsEl based on menu contents that require scroll bar', () => {
            const menuEl = {
                offsetWidth: 0,
                offsetHeight: 500 // 210 is max height of settings menu
            };
            settings.setMenuContainerDimensions(menuEl);

            expect(settings.settingsEl.style.width).to.equal('32px');
        });

        it('should grow the height of the settingsEl to that of the sub-menu, with padding', () => {
            const menuEl = {
                offsetWidth: 0,
                offsetHeight: 18
            };
            settings.setMenuContainerDimensions(menuEl);

            // Adds 18px (padding) + 1px (extra zoom height) to the offsetHeight of sum of child element's heights
            expect(settings.settingsEl.style.height).to.equal(18 + 18 + 1 + 'px');
        });
    });

    describe('destroy()', () => {
        it('should remove event listeners on settings element and document', () => {
            sandbox.stub(settings.settingsEl, 'removeEventListener');
            sandbox.stub(document, 'removeEventListener');

            settings.destroy();

            expect(settings.settingsEl.removeEventListener).to.be.calledWith('click', settings.menuEventHandler);
            expect(settings.settingsEl.removeEventListener).to.be.calledWith('keydown', settings.menuEventHandler);
            expect(document.removeEventListener).to.be.calledWith('click', settings.blurHandler);
        });
    });

    describe('init()', () => {
        it('should set the initial quality and speed', () => {
            sandbox.stub(settings, 'chooseOption');
            const quality = 'sd';
            const speed = '2.0';
            const autoplay = 'Enabled'

            const getStub = sandbox.stub(settings.cache, 'get');
            getStub.withArgs('media-quality').returns(quality);
            getStub.withArgs('media-speed').returns(speed);
            getStub.withArgs('media-autoplay').returns(autoplay);


            settings.init();

            expect(settings.chooseOption).to.be.calledWith('quality', quality);
            expect(settings.chooseOption).to.be.calledWith('speed', speed);
            expect(settings.chooseOption).to.be.calledWith('autoplay', autoplay);

        });
    });

    describe('reset()', () => {
        it('should reset the classes for the settings element', () => {
            settings.settingsEl.className = 'blah';

            settings.reset();

            expect(settings.settingsEl).to.have.class('bp-media-settings');
        });

        it('should reset the menu container dimensions', () => {
            const mainMenu = settings.settingsEl.querySelector('.bp-media-settings-menu-main');
            sandbox.stub(settings, 'setMenuContainerDimensions');

            settings.reset();

            expect(settings.setMenuContainerDimensions).to.be.calledWith(mainMenu);
        });
    });

    describe('findParentDataType()', () => {
        it('should find the parent node with a data type', () => {
            let target = document.querySelector('.bp-media-settings-label');
            expect(settings.findParentDataType(target)).to.have.class('bp-media-settings-item');

            target = document.querySelector('.blah');
            expect(settings.findParentDataType(target)).to.be.null;
        });
    });

    describe('menuEventHandler() select', () => {
        beforeEach(() => {
            sandbox.stub(settings, 'reset');
            sandbox.stub(settings, 'chooseOption');
            sandbox.stub(settings, 'showSubMenu');
        });

        it('should not do anything if not in the settings element', () => {
            sandbox.stub(settings, 'findParentDataType').returns(null);

            settings.menuEventHandler({ type: 'click' });

            expect(settings.reset).to.not.be.called;
            expect(settings.chooseOption).to.not.be.called;
            expect(settings.settingsEl.className).to.equal('bp-media-settings');
        });

        it('should reset menu and focus first element on click on menu data-type', () => {
            sandbox.stub(settings, 'findParentDataType').returns(document.querySelector('[data-type="menu"]'));

            settings.menuEventHandler({ type: 'click' });
            settings.settingsEl.classList.remove('bp-media-settings-in-transition'); // simulate transition end

            expect(settings.reset).to.be.called;
            expect(settings.chooseOption).to.not.be.called;
            expect(settings.settingsEl.className).to.equal('bp-media-settings');
            expect(document.activeElement).to.equal(settings.firstMenuItem);
        });

        it('should reset menu and focus first element on Space on menu data-type', () => {
            sandbox.stub(settings, 'findParentDataType').returns(document.querySelector('[data-type="menu"]'));
            const event = {
                type: 'keydown',
                key: 'Space',
                preventDefault: sandbox.stub(),
                stopPropagation: sandbox.stub()
            };

            settings.menuEventHandler(event);
            settings.settingsEl.classList.remove('bp-media-settings-in-transition'); // simulate transition end

            expect(settings.reset).to.be.called;
            expect(settings.chooseOption).to.not.be.called;
            expect(settings.settingsEl.className).to.equal('bp-media-settings');
            expect(document.activeElement).to.equal(settings.firstMenuItem);
            expect(event.preventDefault).to.be.called;
            expect(event.stopPropagation).to.be.called;
            expect(settings.containerEl).to.have.class('bp-has-keyboard-focus');
        });

        it('should reset menu and focus first element on Enter on menu data-type', () => {
            sandbox.stub(settings, 'findParentDataType').returns(document.querySelector('[data-type="menu"]'));
            const event = {
                type: 'keydown',
                key: 'Enter',
                preventDefault: sandbox.stub(),
                stopPropagation: sandbox.stub()
            };

            settings.menuEventHandler(event);
            settings.settingsEl.classList.remove('bp-media-settings-in-transition'); // simulate transition end

            expect(settings.reset).to.be.called;
            expect(settings.chooseOption).to.not.be.called;
            expect(settings.settingsEl.className).to.equal('bp-media-settings');
            expect(document.activeElement).to.equal(settings.firstMenuItem);
            expect(event.preventDefault).to.be.called;
            expect(event.stopPropagation).to.be.called;
            expect(settings.containerEl).to.have.class('bp-has-keyboard-focus');
        });

        it('should choose option, focus first element, and reset menu on click on sub menu option', () => {
            sandbox
                .stub(settings, 'findParentDataType')
                .returns(document.querySelector('[data-type="speed"][data-value="2.0"]'));
            settings.menuEventHandler({ type: 'click' });
            settings.settingsEl.classList.remove('bp-media-settings-in-transition'); // simulate transition end

            expect(settings.reset).to.not.be.called;
            expect(settings.chooseOption).to.be.calledWith('speed', '2.0');
            expect(settings.settingsEl.className).to.equal('bp-media-settings');
            expect(document.activeElement).to.equal(settings.firstMenuItem);
        });

        it('should choose option, focus first element, and reset menu on Space on sub menu option', () => {
            sandbox
                .stub(settings, 'findParentDataType')
                .returns(document.querySelector('[data-type="speed"][data-value="2.0"]'));
            const event = {
                type: 'keydown',
                key: 'Space',
                preventDefault: sandbox.stub(),
                stopPropagation: sandbox.stub()
            };
            settings.menuEventHandler(event);
            settings.settingsEl.classList.remove('bp-media-settings-in-transition'); // simulate transition end

            expect(settings.reset).to.not.be.called;
            expect(settings.chooseOption).to.be.calledWith('speed', '2.0');
            expect(settings.settingsEl.className).to.equal('bp-media-settings');
            expect(document.activeElement).to.equal(settings.firstMenuItem);
            expect(event.preventDefault).to.be.called;
            expect(event.stopPropagation).to.be.called;
            expect(settings.containerEl).to.have.class('bp-has-keyboard-focus');
        });

        it('should choose option, focus first element, and reset menu on Enter on sub menu option', () => {
            sandbox
                .stub(settings, 'findParentDataType')
                .returns(document.querySelector('[data-type="speed"][data-value="2.0"]'));
            const event = {
                type: 'keydown',
                key: 'Enter',
                preventDefault: sandbox.stub(),
                stopPropagation: sandbox.stub()
            };
            settings.menuEventHandler(event);
            settings.settingsEl.classList.remove('bp-media-settings-in-transition'); // simulate transition end

            expect(settings.reset).to.not.be.called;
            expect(settings.chooseOption).to.be.calledWith('speed', '2.0');
            expect(settings.settingsEl.className).to.equal('bp-media-settings');
            expect(document.activeElement).to.equal(settings.firstMenuItem);
            expect(event.preventDefault).to.be.called;
            expect(event.stopPropagation).to.be.called;
            expect(settings.containerEl).to.have.class('bp-has-keyboard-focus');
        });

        it('should go to sub menu on click on an option on main menu', () => {
            // Starting from the main menu
            sandbox
                .stub(settings, 'findParentDataType')
                .returns(document.querySelector('.bp-media-settings-item-speed'));

            settings.menuEventHandler({ type: 'click' });

            expect(settings.reset).to.not.be.called;
            expect(settings.showSubMenu).to.be.calledWith('speed');
        });

        it('should go to sub menu on Space on an option on main menu', () => {
            // Starting from the main menu
            sandbox
                .stub(settings, 'findParentDataType')
                .returns(document.querySelector('.bp-media-settings-item-speed'));
            const event = {
                type: 'keydown',
                key: 'Space',
                preventDefault: sandbox.stub(),
                stopPropagation: sandbox.stub()
            };

            settings.menuEventHandler(event);

            expect(settings.reset).to.not.be.called;
            expect(settings.showSubMenu).to.be.calledWith('speed');
            expect(event.preventDefault).to.be.called;
            expect(event.stopPropagation).to.be.called;
            expect(settings.containerEl).to.have.class('bp-has-keyboard-focus');
        });

        it('should go to sub menu on Enter on an option on main menu', () => {
            // Starting from the main menu
            sandbox
                .stub(settings, 'findParentDataType')
                .returns(document.querySelector('.bp-media-settings-item-speed'));
            const event = {
                type: 'keydown',
                key: 'Enter',
                preventDefault: sandbox.stub(),
                stopPropagation: sandbox.stub()
            };

            settings.menuEventHandler(event);

            expect(settings.reset).to.not.be.called;
            expect(settings.showSubMenu).to.be.calledWith('speed');
            expect(event.preventDefault).to.be.called;
            expect(event.stopPropagation).to.be.called;
            expect(settings.containerEl).to.have.class('bp-has-keyboard-focus');
        });
    });

    describe('menuEventHandler() navigate', () => {
        beforeEach(() => {
            sandbox.stub(settings, 'reset');
            sandbox.stub(settings, 'showSubMenu');
        });

        it('should go up on arrowup', () => {
            // Starting from the quality item in the main menu
            sandbox
                .stub(settings, 'findParentDataType')
                .returns(document.querySelector('.bp-media-settings-item-quality'));
            const event = {
                type: 'keydown',
                key: 'ArrowUp',
                preventDefault: sandbox.stub(),
                stopPropagation: sandbox.stub()
            };

            settings.menuEventHandler(event);

            expect(document.activeElement).to.equal(document.querySelector('.bp-media-settings-item-speed'));
            expect(settings.reset).to.not.be.called;
            expect(settings.showSubMenu).to.not.be.called;
            expect(event.preventDefault).to.be.called;
            expect(event.stopPropagation).to.be.called;
            expect(settings.containerEl).to.have.class('bp-has-keyboard-focus');
        });

        it('should do nothing on arrowup except add keyboard-focus class if already at top item', () => {
            // Starting from the speed item in the main menu
            sandbox
                .stub(settings, 'findParentDataType')
                .returns(document.querySelector('.bp-media-settings-item-speed'));
            const event = {
                type: 'keydown',
                key: 'ArrowUp',
                preventDefault: sandbox.stub(),
                stopPropagation: sandbox.stub()
            };

            settings.menuEventHandler(event);

            expect(settings.reset).to.not.be.called;
            expect(settings.showSubMenu).to.not.be.called;
            expect(event.preventDefault).to.be.called;
            expect(event.stopPropagation).to.be.called;
            expect(settings.containerEl).to.have.class('bp-has-keyboard-focus');
        });

        it('should go down on arrowdown', () => {
            // Starting from the speed item in the main menu
            sandbox
                .stub(settings, 'findParentDataType')
                .returns(document.querySelector('.bp-media-settings-item-speed'));
            const event = {
                type: 'keydown',
                key: 'ArrowDown',
                preventDefault: sandbox.stub(),
                stopPropagation: sandbox.stub()
            };

            settings.menuEventHandler(event);

            expect(document.activeElement).to.equal(document.querySelector('.bp-media-settings-item-quality'));
            expect(settings.reset).to.not.be.called;
            expect(settings.showSubMenu).to.not.be.called;
            expect(event.preventDefault).to.be.called;
            expect(event.stopPropagation).to.be.called;
            expect(settings.containerEl).to.have.class('bp-has-keyboard-focus');
        });

        it('should do nothing on arrowdown except add keyboard-focus class if already at bottom item', () => {
            // Starting from the quality item in the main menu
            sandbox
                .stub(settings, 'findParentDataType')
                .returns(document.querySelector('.bp-media-settings-item-quality'));
            const event = {
                type: 'keydown',
                key: 'ArrowDown',
                preventDefault: sandbox.stub(),
                stopPropagation: sandbox.stub()
            };

            settings.menuEventHandler(event);

            expect(settings.reset).to.not.be.called;
            expect(settings.showSubMenu).to.not.be.called;
            expect(event.preventDefault).to.be.called;
            expect(event.stopPropagation).to.be.called;
            expect(settings.containerEl).to.have.class('bp-has-keyboard-focus');
        });

        it('should go to main menu on arrowleft if on sub menu', () => {
            // Starting from sub menu
            sandbox
                .stub(settings, 'findParentDataType')
                .returns(document.querySelector('.bp-media-settings-selected[data-type="speed"]'));
            const event = {
                type: 'keydown',
                key: 'ArrowLeft',
                preventDefault: sandbox.stub(),
                stopPropagation: sandbox.stub()
            };

            settings.menuEventHandler(event);

            expect(settings.reset).to.be.called;
            expect(document.activeElement).to.be.equal(settings.firstMenuItem);
            expect(settings.showSubMenu).to.not.be.called;
            expect(event.preventDefault).to.be.called;
            expect(event.stopPropagation).to.be.called;
        });

        it('should do nothing on arrowleft if on main menu', () => {
            // Starting from the main menu
            sandbox
                .stub(settings, 'findParentDataType')
                .returns(document.querySelector('.bp-media-settings-item-speed'));
            const event = {
                type: 'keydown',
                key: 'ArrowLeft',
                preventDefault: sandbox.stub(),
                stopPropagation: sandbox.stub()
            };

            settings.menuEventHandler(event);

            expect(settings.reset).to.not.be.called;
            expect(document.activeElement).to.be.equal(settings.firstMenuItem);
            expect(settings.showSubMenu).to.not.be.called;
            expect(event.preventDefault).to.be.called;
            expect(event.stopPropagation).to.be.called;
        });

        it('should go to speed sub menu on arrowright if on speed main menu item', () => {
            // Starting from the speed menu item
            sandbox
                .stub(settings, 'findParentDataType')
                .returns(document.querySelector('.bp-media-settings-item-speed'));
            const event = {
                type: 'keydown',
                key: 'ArrowRight',
                preventDefault: sandbox.stub(),
                stopPropagation: sandbox.stub()
            };

            settings.menuEventHandler(event);

            expect(settings.reset).to.not.be.called;
            expect(settings.showSubMenu).to.be.calledWith('speed');
            expect(event.preventDefault).to.be.called;
            expect(event.stopPropagation).to.be.called;
        });

        it('should do nothing on arrowright if on sub menu', () => {
            // Starting from the sub menu
            sandbox
                .stub(settings, 'findParentDataType')
                .returns(document.querySelector('.bp-media-settings-selected[data-type="speed"]'));
            const event = {
                type: 'keydown',
                key: 'ArrowRight',
                preventDefault: sandbox.stub(),
                stopPropagation: sandbox.stub()
            };

            settings.menuEventHandler(event);

            expect(settings.reset).to.not.be.called;
            expect(settings.showSubMenu).to.not.be.called;
            expect(event.preventDefault).to.be.called;
            expect(event.stopPropagation).to.be.called;
        });

        it('should go to quality sub menu on arrowright if on quality main menu item', () => {
            // Starting from the quality menu item
            sandbox
                .stub(settings, 'findParentDataType')
                .returns(document.querySelector('.bp-media-settings-item-quality'));
            const event = {
                type: 'keydown',
                key: 'ArrowRight',
                preventDefault: sandbox.stub(),
                stopPropagation: sandbox.stub()
            };

            settings.menuEventHandler(event);

            expect(settings.reset).to.not.be.called;
            expect(settings.showSubMenu).to.be.calledWith('quality');
            expect(event.preventDefault).to.be.called;
            expect(event.stopPropagation).to.be.called;
        });

        it('should hide menu and restore focus to settings button on escape', () => {
            sandbox.stub(settings, 'hide');
            // Starting from the main menu
            sandbox
                .stub(settings, 'findParentDataType')
                .returns(document.querySelector('.bp-media-settings-item-speed'));
            const event = {
                type: 'keydown',
                key: 'Escape',
                preventDefault: sandbox.stub(),
                stopPropagation: sandbox.stub()
            };

            settings.menuEventHandler(event);

            expect(settings.hide).to.be.called;
            expect(document.activeElement).to.be.equal(settings.settingsButtonEl);
            expect(event.preventDefault).to.be.called;
            expect(event.stopPropagation).to.be.called;
        });
    });

    describe('handleTransitionEnd', () => {
        it('should remove in transition class', () => {
            settings.settingsEl.classList.add('bp-media-settings-in-transition');
            settings.handleTransitionEnd();
            expect(settings.settingsEl).to.not.have.class('bp-media-settings-in-transition');
        });
    });

    describe('showSubMenu()', () => {
        it('should do nothing if the sub menu is disabled', () => {
            sandbox.stub(settings, 'setMenuContainerDimensions');
            settings.showSubMenu('quality');
            expect(settings.setMenuContainerDimensions).to.not.be.called;
        });

        it('should show the speed submenu if speed is selected', () => {
            settings.showSubMenu('speed');
            expect(settings.settingsEl).to.have.class('bp-media-settings-show-speed');
        });

        it('should show the quality submenu if quality is selected', () => {
            settings.enableHD();
            settings.showSubMenu('quality');
            expect(settings.settingsEl).to.have.class('bp-media-settings-show-quality');
        });

        it('should focus on the currently selected value', () => {
            // Select a different speed for testing purposes
            const prevSelected = settings.settingsEl.querySelector(
                '[data-type="speed"].bp-media-settings-sub-item.bp-media-settings-selected'
            );
            prevSelected.classList.remove('bp-media-settings-selected');
            const selected = settings.settingsEl.querySelector('[data-value="1.25"]');
            selected.classList.add('bp-media-settings-selected');

            settings.showSubMenu('speed');

            expect(document.activeElement).to.equal(selected);
        });

        it('should recompute the menu container dimensions', () => {
            sandbox.stub(settings, 'setMenuContainerDimensions');

            settings.showSubMenu('speed');

            expect(settings.setMenuContainerDimensions).to.be.called;
        });
    });

    describe('menuItemSelect()', () => {
        let menuItem;

        beforeEach(() => {
            menuItem = document.createElement('div');
            menuItem.setAttribute('data-type', 'someOption');
            menuItem.setAttribute('data-value', 'someValue');

            sandbox.stub(settings, 'reset');
            settings.firstMenuItem = {
                focus: sandbox.stub()
            };
            sandbox.stub(settings, 'chooseOption');
            sandbox.stub(settings, 'showSubMenu');
        });

        it('should add menu settings in transition class', () => {
            settings.menuItemSelect(menuItem);
            expect(settings.settingsEl).to.have.class('bp-media-settings-in-transition');
        });

        it('should reset and focus first menu item if selected item is the option to return to menu', () => {
            menuItem.setAttribute('data-type', 'menu');

            settings.menuItemSelect(menuItem);
            expect(settings.reset).to.be.called;
            expect(settings.firstMenuItem.focus).to.be.called;
        });

        it('should choose option if an menu option with a type and value are selected', () => {
            settings.menuItemSelect(menuItem);
            expect(settings.chooseOption).to.be.calledWith('someOption', 'someValue');
        });

        it('should show sub menu if selected option is a sub menu option', () => {
            const optionType = 'submenu';
            menuItem.setAttribute('data-type', optionType);
            menuItem.setAttribute('data-value', '');

            settings.menuItemSelect(menuItem);
            expect(settings.showSubMenu).to.be.calledWith(optionType);
        });
    });

    describe('chooseOption()', () => {
        it('should reset the menu and focus, cache option, and emit chosen option', () => {
            sandbox.stub(settings, 'reset');
            sandbox.stub(settings.cache, 'set');
            sandbox.stub(settings, 'emit');

            const type = 'speed';
            const value = 0.5;
            settings.chooseOption(type, value);

            expect(settings.cache.set).to.be.calledWith(`media-${type}`, value);
            expect(settings.emit).to.be.calledWith(type);
            expect(settings.reset).to.be.called;
            expect(document.activeElement).to.be.equal(settings.firstMenuItem);
        });

        it('should set the option value on the top menu and update the checkmark', () => {
            settings.chooseOption('speed', 0.5);

            expect(document.querySelector('[data-type="speed"] .bp-media-settings-value').textContent).to.equal('0.5');
            expect(document.querySelector('[data-type="speed"][data-value="1.0"]')).to.not.have.class(
                'bp-media-settings-selected'
            );
            expect(document.querySelector('[data-type="speed"][data-value="0.5"]')).to.have.class(
                'bp-media-settings-selected'
            );
        });

        it('should do special handling for subtitles', () => {
            sandbox.stub(settings, 'handleSubtitleSelection');

            settings.chooseOption('subtitles', '-1');

            expect(settings.handleSubtitleSelection).to.be.called;
        });

        it('should not do special subtitle handling for non-subtitles', () => {
            sandbox.stub(settings, 'handleSubtitleSelection');

            settings.chooseOption('speed', 0.5);

            expect(settings.handleSubtitleSelection).to.not.be.called;
        });

        it('should not not set the cache if setCache is set to false', () => {
            sandbox.stub(settings, 'handleSubtitleSelection');
            sandbox.stub(settings.cache, 'set');


            settings.chooseOption('speed', 0.5, false);

            expect(settings.cache.set).to.not.be.called;
        });
    });

    describe('handleSubtitleSelection()', () => {
        it('should save previous value when turning off subtitles', () => {
            settings.toggleToSubtitle = '2';
            settings.handleSubtitleSelection('3', '-1');

            expect(settings.toggleToSubtitle).to.equal('3');
            expect(settings.areSubtitlesOn()).to.equal(false);
            expect(settings.ccButtonEl.getAttribute('aria-pressed')).to.equal('false');
            expect(settings.containerEl).to.not.have.class('bp-media-settings-subtitles-on');
        });

        it('should NOT save old value when turning off subtitles if subtitles were already off', () => {
            settings.toggleToSubtitle = '2';
            settings.handleSubtitleSelection('-1', '-1');

            expect(settings.toggleToSubtitle).to.equal('2');
            expect(settings.areSubtitlesOn()).to.equal(false);
            expect(settings.ccButtonEl.getAttribute('aria-pressed')).to.equal('false');
            expect(settings.containerEl).to.not.have.class('bp-media-settings-subtitles-on');
        });

        it('should set subtitles-on on container when subtitles are selected', () => {
            settings.handleSubtitleSelection('-1', '2');

            expect(settings.ccButtonEl.getAttribute('aria-pressed')).to.equal('true');
            expect(settings.containerEl).to.have.class('bp-media-settings-subtitles-on');
        });
    });

    describe('toggleSubtitles()', () => {
        it('Should turn off subtitles if they were previously on', () => {
            sandbox.stub(settings, 'chooseOption');
            sandbox.stub(settings, 'hasSubtitles').returns(true);
            sandbox.stub(settings, 'areSubtitlesOn').returns(true);

            settings.toggleSubtitles();

            expect(settings.chooseOption).to.be.calledWith('subtitles', '-1');
        });

        it('Should turn on subtitles if they were previously off', () => {
            sandbox.stub(settings, 'chooseOption');
            sandbox.stub(settings, 'hasSubtitles').returns(true);
            sandbox.stub(settings, 'areSubtitlesOn').returns(false);
            settings.toggleToSubtitle = '2';

            settings.toggleSubtitles();

            expect(settings.chooseOption).to.be.calledWith('subtitles', '2');
        });

        it('Should prefer subtitle matching previewer language/locale', () => {
            sandbox.stub(settings, 'chooseOption');
            sandbox.stub(settings, 'hasSubtitles').returns(true);
            sandbox.stub(settings, 'areSubtitlesOn').returns(false);
            settings.subtitles = ['English', 'Spanish', 'Russian', 'French'];
            settings.language = 'Spanish';

            settings.toggleSubtitles();

            expect(settings.chooseOption).to.be.calledWith('subtitles', '1');
        });

        it('Should prefer English subtitle if previewer language not in list', () => {
            sandbox.stub(settings, 'chooseOption');
            sandbox.stub(settings, 'hasSubtitles').returns(true);
            sandbox.stub(settings, 'areSubtitlesOn').returns(false);
            settings.subtitles = ['Spanish', 'Russian', 'English', 'French'];
            settings.language = 'Mongolian';

            settings.toggleSubtitles();

            expect(settings.chooseOption).to.be.calledWith('subtitles', '2');
        });

        it('Should prefer first subtitle in list if previewer language not in list and English absent', () => {
            sandbox.stub(settings, 'chooseOption');
            sandbox.stub(settings, 'hasSubtitles').returns(true);
            sandbox.stub(settings, 'areSubtitlesOn').returns(false);
            settings.subtitles = ['Spanish', 'Russian', 'French'];
            settings.language = 'Mongolian';

            settings.toggleSubtitles();

            expect(settings.chooseOption).to.be.calledWith('subtitles', '0');
        });
    });

    describe('loadSubtitles()', () => {
        it('Should load all subtitles and make them available', () => {
            const subsMenu = settings.settingsEl.querySelector('.bp-media-settings-menu-subtitles');

            settings.loadSubtitles(['English', 'Russian', 'Spanish']);

            expect(subsMenu.children.length).to.equal(5); // Three languages, 'Off', and back to main menu
            expect(settings.hasSubtitles()).to.be.true;
            expect(settings.containerEl).to.not.have.class('bp-media-settings-subtitles-unavailable');
        });

        it('Should reset menu dimensions after loading', () => {
            sandbox.stub(settings, 'setMenuContainerDimensions');

            settings.loadSubtitles(['English', 'Russian', 'Spanish']);

            expect(settings.setMenuContainerDimensions).to.be.calledWith(settings.settingsEl.firstChild);
        });

        it('Should toggle on subtitles if they were on in the most recently viewed subtitled video', () => {
            sandbox.stub(settings, 'chooseOption');
            sandbox.stub(settings, 'areSubtitlesOn').returns(false);
            sandbox.stub(settings.cache, 'get').withArgs('media-subtitles').returns('2');

            settings.loadSubtitles(['English', 'Russian', 'Spanish']);

            expect(settings.chooseOption).to.be.calledWith('subtitles', '0');
        });

        it('Should not toggle on subtitles if they were off in the most recently viewed subtitled video', () => {
            sandbox.stub(settings, 'chooseOption');
            sandbox.stub(settings, 'areSubtitlesOn').returns(false);
            sandbox.stub(settings.cache, 'get').withArgs('media-subtitles').returns('-1');

            settings.loadSubtitles(['English', 'Russian', 'Spanish']);

            expect(settings.chooseOption).to.not.be.called;
        });

        it('Should escape subtitle names', () => {
            const subsMenu = settings.settingsEl.querySelector('.bp-media-settings-menu-subtitles');

            settings.loadSubtitles(['English', '<badboy>']);

            const sub0 = subsMenu.querySelector('[data-value="0"]').querySelector('.bp-media-settings-value');
            const sub1 = subsMenu.querySelector('[data-value="1"]').querySelector('.bp-media-settings-value');
            expect(sub0.innerHTML).to.equal('English');
            expect(sub1.innerHTML).to.equal('&lt;badboy&gt;');
        });
    });

    describe('loadAlternateAudio()', () => {
        it('Should load all audio tracks and make them available', () => {
            const audioMenu = settings.settingsEl.querySelector('.bp-media-settings-menu-audiotracks');
            sandbox.stub(settings, 'chooseOption');

            settings.loadAlternateAudio(['English', 'Russian', 'Spanish']);

            expect(settings.chooseOption).to.be.calledWith('audiotracks', '0');
            expect(audioMenu.children.length).to.equal(4); // Three languages, and back to main menu
            expect(settings.containerEl).to.not.have.class('bp-media-settings-audiotracks-unavailable');
        });

        it('Should reset menu dimensions after loading', () => {
            sandbox.stub(settings, 'setMenuContainerDimensions');

            settings.loadAlternateAudio(['English', 'Russian', 'Spanish']);

            expect(settings.setMenuContainerDimensions).to.be.calledWith(settings.settingsEl.firstChild);
        });

        it('Should not list language for "und" language code', () => {
            const audioMenu = settings.settingsEl.querySelector('.bp-media-settings-menu-audiotracks');

            settings.loadAlternateAudio(['English', 'und']);

            const audio0 = audioMenu.querySelector('[data-value="0"]').querySelector('.bp-media-settings-value');
            const audio1 = audioMenu.querySelector('[data-value="1"]').querySelector('.bp-media-settings-value');
            expect(audio0.innerHTML).to.equal('Track 1 (English)');
            expect(audio1.innerHTML).to.equal('Track 2');
        });

        it('Should escape audio languages and roles', () => {
            const audioMenu = settings.settingsEl.querySelector('.bp-media-settings-menu-audiotracks');

            // There shouldn't be a way to get such inputs into this method in normal use case anyway
            // because it goes through multiple levels of sanitization, but just in case...
            settings.loadAlternateAudio(['English', '<badboy>']);

            const audio0 = audioMenu.querySelector('[data-value="0"]').querySelector('.bp-media-settings-value');
            const audio1 = audioMenu.querySelector('[data-value="1"]').querySelector('.bp-media-settings-value');
            expect(audio0.innerHTML).to.equal('Track 1 (English)');
            expect(audio1.innerHTML).to.equal('Track 2 (&lt;badboy&gt;)');
        });
    });

    describe('hasSubtitles()', () => {
        it('Should be false before loading subtitles', () => {
            expect(settings.hasSubtitles()).to.be.false;
        });

        it('Should be true after loading subtitles', () => {
            settings.loadSubtitles(['English']);

            expect(settings.hasSubtitles()).to.be.true;
        });
    });

    describe('blurHandler()', () => {
        it('should hide if click is outside of settings element', () => {
            sandbox.stub(settings, 'hide');

            settings.blurHandler({ type: 'click', target: this.containerEl });

            expect(settings.hide).to.be.called;
        });

        it('should hide if space is pressed outside of settings element', () => {
            sandbox.stub(settings, 'hide');

            settings.blurHandler({ type: 'keydown', key: 'Space', target: this.containerEl });

            expect(settings.hide).to.be.called;
        });

        it('should hide if enter is pressed outside of settings element', () => {
            sandbox.stub(settings, 'hide');

            settings.blurHandler({ type: 'keydown', key: 'Enter', target: this.containerEl });

            expect(settings.hide).to.be.called;
        });

        it('should not hide if click is on settings button', () => {
            sandbox.stub(settings, 'hide');

            settings.blurHandler({ type: 'click', target: document.querySelector('.bp-media-gear-icon') });

            expect(settings.hide).to.not.be.called;
        });

        it('should not hide if space is pressed on settings button', () => {
            sandbox.stub(settings, 'hide');

            settings.blurHandler({
                type: 'keydown',
                key: 'Space',
                target: document.querySelector('.bp-media-gear-icon')
            });

            expect(settings.hide).to.not.be.called;
        });

        it('should not hide if enter is pressed on settings button', () => {
            sandbox.stub(settings, 'hide');

            settings.blurHandler({
                type: 'keydown',
                key: 'Enter',
                target: document.querySelector('.bp-media-gear-icon')
            });

            expect(settings.hide).to.not.be.called;
        });

        it('should not hide if click is on settings menu', () => {
            sandbox.stub(settings, 'hide');

            settings.blurHandler({ type: 'click', target: document.querySelector('.bp-media-settings-item') });

            expect(settings.hide).to.not.be.called;
        });

        it('should not hide if space is pressed on settings button', () => {
            sandbox.stub(settings, 'hide');

            settings.blurHandler({
                type: 'keydown',
                key: 'Space',
                target: document.querySelector('.bp-media-settings-item')
            });

            expect(settings.hide).to.not.be.called;
        });

        it('should not hide if enter is pressed on settings button', () => {
            sandbox.stub(settings, 'hide');

            settings.blurHandler({
                type: 'keydown',
                key: 'Enter',
                target: document.querySelector('.bp-media-settings-item')
            });

            expect(settings.hide).to.not.be.called;
        });

        it('should hide and stop propagation if escape is pressed outside of settings element', () => {
            sandbox.stub(settings, 'hide');
            const event = {
                type: 'keydown',
                key: 'Escape',
                target: document.querySelector('.bp-media-gear-icon'),
                preventDefault: sandbox.stub(),
                stopPropagation: sandbox.stub()
            };

            settings.blurHandler(event);

            expect(settings.hide).to.be.called;
            expect(event.preventDefault).to.be.called;
            expect(event.stopPropagation).to.be.called;
        });

        it('should not hide if escape is pressed in settings menu', () => {
            sandbox.stub(settings, 'hide');
            const event = {
                type: 'keydown',
                key: 'Escape',
                target: document.querySelector('.bp-media-settings-item'),
                preventDefault: sandbox.stub(),
                stopPropagation: sandbox.stub()
            };

            settings.blurHandler(event);

            expect(settings.hide).to.not.be.called;
            expect(event.preventDefault).to.not.be.called;
            expect(event.stopPropagation).to.not.be.called;
        });
    });

    describe('isVisible()', () => {
        it('should return visible property', () => {
            settings.visible = true;
            expect(settings.isVisible()).to.be.true;

            settings.visible = false;
            expect(settings.isVisible()).to.be.false;
        });
    });

    describe('show()', () => {
        it('should add open class, move focus to first item, and add a blur handler', () => {
            sandbox.stub(document, 'addEventListener');

            settings.show();

            expect(settings.visible).to.be.true;
            expect(settings.containerEl).to.have.class('bp-media-settings-is-open');
            expect(document.addEventListener).to.be.calledWith('click', settings.blurHandler);
            expect(document.addEventListener).to.be.calledWith('keydown', settings.blurHandler);
            expect(document.activeElement).to.be.equal(settings.firstMenuItem);
        });
    });

    describe('hide()', () => {
        it('should reset, remove the open class, and remove the blur handler', () => {
            sandbox.stub(settings, 'reset');
            sandbox.stub(document, 'removeEventListener');

            settings.hide();

            expect(settings.reset).to.be.called;
            expect(settings.containerEl).to.not.have.class('bp-media-settings-is-open');
            expect(settings.visible).to.be.false;
            expect(document.removeEventListener).to.be.calledWith('click', settings.blurHandler);
            expect(document.removeEventListener).to.be.calledWith('keydown', settings.blurHandler);
        });
    });

    describe('enableHD()', () => {
        it('should remove the unavailable class, enable the sub menu, and choose the cached quality option', () => {
            sandbox.stub(settings.cache, 'get').returns('hd');
            sandbox.stub(settings, 'chooseOption');
            const CLASS_SETTINGS_QUALITY_MENU = 'bp-media-settings-menu-quality';
            const qualitySubMenu = settings.containerEl.querySelector(`.${CLASS_SETTINGS_QUALITY_MENU}`)

            settings.enableHD();

            expect(settings.containerEl.classList.contains('bp-media-settings-hd-unavailable')).to.be.false;
            expect(settings.chooseOption).to.be.calledWith('quality', 'hd');
            expect(qualitySubMenu.getAttribute('data-disabled')).to.equal('');
        });
    });
});
