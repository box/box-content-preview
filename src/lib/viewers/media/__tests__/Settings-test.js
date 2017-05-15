/* eslint-disable no-unused-expressions */
import Settings from '../Settings';
import cache from '../../../Cache';

let settings;
const sandbox = sinon.sandbox.create();

describe('lib/viewers/media/Settings', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/media/__tests__/Settings-test.html');
        const containerEl = document.querySelector('.container');
        settings = new Settings(containerEl);
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
            expect(settings.visible).to.be.false;
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
            settings.chooseOption('speed', '1.25');
            settings.increaseSpeed();
            const speed = cache.get('media-speed');
            expect(speed).to.equal('1.5');
        });

        it('should not increase speed after max', () => {
            settings.chooseOption('speed', '2.0');
            settings.increaseSpeed();
            const speed = cache.get('media-speed');
            expect(speed).to.equal('2.0');
        });
    });

    describe('decreaseSpeed()', () => {
        it('should decrease speed one step', () => {
            settings.chooseOption('speed', '1.5');
            settings.decreaseSpeed();
            const speed = cache.get('media-speed');
            expect(speed).to.equal('1.25');
        });

        it('should not decrease speed after min', () => {
            settings.chooseOption('speed', '0.5');
            settings.decreaseSpeed();
            const speed = cache.get('media-speed');
            expect(speed).to.equal('0.25');
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
            const quality = 'HD';
            const speed = '2.0';

            const getStub = sandbox.stub(cache, 'get');
            getStub.withArgs('media-quality').returns(quality);
            getStub.withArgs('media-speed').returns(speed);

            settings.init();

            expect(settings.chooseOption).to.be.calledWith('quality', quality);
            expect(settings.chooseOption).to.be.calledWith('speed', speed);
        });

        it('should initialize the menu dimensions', () => {
            sandbox.stub(settings, 'chooseOption');
            sandbox.stub(settings, 'setSettingsMenuWidths');

            settings.init();

            expect(settings.setSettingsMenuWidths).to.be.called;
        });
    });

    describe('reset()', () => {
        it('should reset the classes for the settings element', () => {
            settings.settingsEl.className = 'blah';

            settings.reset();

            expect(settings.settingsEl).to.have.class('bp-media-settings');
        });

        it('should reset the menu height', () => {
            sandbox.stub(settings, 'setMenuHeight');

            settings.reset();

            expect(settings.setMenuHeight).to.be.calledWith(settings.mainMenu);
        });
    });

    describe('setMenuWidth()', () => {
        // NOTE: labels and values do not need matching widths - only internal consistency
        // is needed amongst labels and amongst values. They happen to end up being the same
        // in this test. This test cannot test that the widths get set to the max width
        // because offsetWidth cannot be mocked out, since it's a readonly property
        it('should set consistent width across all labels', () => {
            const fakeMenuHTML = `<div role="menu">
                <div class="menu-item">
                    <div class="bp-media-settings-label" style="width:10px"/>
                    <div class="bp-media-settings-value" style="width:100px"/>
                </div>
                <div class="menu-item">
                    <div class="bp-media-settings-label" style="width:15px"/>
                    <div class="bp-media-settings-value" style="width:95px"/>
                </div>
                <div class="menu-item">
                    <div class="bp-media-settings-label" style="width:12px"/>
                    <div class="bp-media-settings-value" style="width:105px"/>
                </div>
            </div>`;
            const parent = document.createElement('div');
            parent.innerHTML = fakeMenuHTML;
            const fakeMenu = parent.firstChild;
            const labels = fakeMenu.querySelectorAll('.bp-media-settings-label');
            const values = fakeMenu.querySelectorAll('.bp-media-settings-value');

            settings.setMenuWidth(fakeMenu);

            // Assert that all the widths are consistent across labels, and across widths
            [].forEach.call(labels, (label) => {
                expect(label.style.width).to.equal(labels[0].style.width);
            });
            [].forEach.call(values, (value) => {
                expect(value.style.width).to.equal(values[0].style.width);
            });
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

            expect(settings.reset).to.be.called;
            expect(settings.chooseOption).to.not.be.called;
            expect(settings.settingsEl.className).to.equal('bp-media-settings');
            expect(document.activeElement).to.equal(settings.firstMenuItem);
            expect(event.preventDefault).to.be.called;
            expect(event.stopPropagation).to.be.called;
            expect(settings.containerEl).to.have.class('bp-has-keyboard-focus');
        });

        it('should choose option, focus first element, and reset menu on click on sub menu option', () => {
            sandbox.stub(settings, 'findParentDataType').returns(document.querySelector('[data-type="speed"][data-value="2.0"]'));
            settings.menuEventHandler({ type: 'click' });

            expect(settings.reset).to.not.be.called;
            expect(settings.chooseOption).to.be.calledWith('speed', '2.0');
            expect(settings.settingsEl.className).to.equal('bp-media-settings');
            expect(document.activeElement).to.equal(settings.firstMenuItem);
        });

        it('should choose option, focus first element, and reset menu on Space on sub menu option', () => {
            sandbox.stub(settings, 'findParentDataType').returns(document.querySelector('[data-type="speed"][data-value="2.0"]'));
            const event = {
                type: 'keydown',
                key: 'Space',
                preventDefault: sandbox.stub(),
                stopPropagation: sandbox.stub()
            };
            settings.menuEventHandler(event);

            expect(settings.reset).to.not.be.called;
            expect(settings.chooseOption).to.be.calledWith('speed', '2.0');
            expect(settings.settingsEl.className).to.equal('bp-media-settings');
            expect(document.activeElement).to.equal(settings.firstMenuItem);
            expect(event.preventDefault).to.be.called;
            expect(event.stopPropagation).to.be.called;
            expect(settings.containerEl).to.have.class('bp-has-keyboard-focus');
        });

        it('should choose option, focus first element, and reset menu on Enter on sub menu option', () => {
            sandbox.stub(settings, 'findParentDataType').returns(document.querySelector('[data-type="speed"][data-value="2.0"]'));
            const event = {
                type: 'keydown',
                key: 'Enter',
                preventDefault: sandbox.stub(),
                stopPropagation: sandbox.stub()
            };
            settings.menuEventHandler(event);

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
            sandbox.stub(settings, 'findParentDataType').returns(document.querySelector('.bp-media-settings-item-speed'));

            settings.menuEventHandler({ type: 'click' });

            expect(settings.reset).to.not.be.called;
            expect(settings.showSubMenu).to.be.calledWith('speed');
        });

        it('should go to sub menu on Space on an option on main menu', () => {
            // Starting from the main menu
            sandbox.stub(settings, 'findParentDataType').returns(document.querySelector('.bp-media-settings-item-speed'));
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
            sandbox.stub(settings, 'findParentDataType').returns(document.querySelector('.bp-media-settings-item-speed'));
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
            sandbox.stub(settings, 'findParentDataType').returns(document.querySelector('.bp-media-settings-item-quality'));
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
            sandbox.stub(settings, 'findParentDataType').returns(document.querySelector('.bp-media-settings-item-speed'));
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
            sandbox.stub(settings, 'findParentDataType').returns(document.querySelector('.bp-media-settings-item-speed'));
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
            sandbox.stub(settings, 'findParentDataType').returns(document.querySelector('.bp-media-settings-item-quality'));
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
            sandbox.stub(settings, 'findParentDataType').returns(document.querySelector('.bp-media-settings-selected[data-type="speed"]'));
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
            sandbox.stub(settings, 'findParentDataType').returns(document.querySelector('.bp-media-settings-item-speed'));
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
            sandbox.stub(settings, 'findParentDataType').returns(document.querySelector('.bp-media-settings-item-speed'));
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
            sandbox.stub(settings, 'findParentDataType').returns(document.querySelector('.bp-media-settings-selected[data-type="speed"]'));
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
            sandbox.stub(settings, 'findParentDataType').returns(document.querySelector('.bp-media-settings-item-quality'));
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
            sandbox.stub(settings, 'findParentDataType').returns(document.querySelector('.bp-media-settings-item-speed'));
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

    describe('showSubMenu()', () => {
        it('should show the speed submenu if speed is selected', () => {
            settings.showSubMenu('speed');
            expect(settings.settingsEl).to.have.class('bp-media-settings-show-speed');
        });

        it('should show the quality submenu if quality is selected', () => {
            settings.showSubMenu('quality');
            expect(settings.settingsEl).to.have.class('bp-media-settings-show-quality');
        });

        it('should focus on the currently selected value', () => {
            // Select a different speed for testing purposes
            const prevSelected = settings.settingsEl.querySelector('[data-type="speed"].bp-media-settings-sub-item.bp-media-settings-selected');
            prevSelected.classList.remove('bp-media-settings-selected');
            const selected = settings.settingsEl.querySelector('[data-value="1.25"]');
            selected.classList.add('bp-media-settings-selected');

            settings.showSubMenu('speed');

            expect(document.activeElement).to.equal(selected);
        });

        it('should recompute the menu height', () => {
            sandbox.stub(settings, 'setMenuHeight');

            settings.showSubMenu('speed');

            expect(settings.setMenuHeight).to.be.called;
        });
    });

    describe('chooseOption()', () => {
        it('should reset the menu and focus, cache option, and emit chosen option', () => {
            sandbox.stub(settings, 'reset');
            sandbox.stub(cache, 'set');
            sandbox.stub(settings, 'emit');

            const type = 'speed';
            const value = 0.5;
            settings.chooseOption(type, value);

            expect(cache.set).to.be.calledWith(`media-${type}`, value);
            expect(settings.emit).to.be.calledWith(type);
            expect(settings.reset).to.be.called;
            expect(document.activeElement).to.be.equal(settings.firstMenuItem);
        });

        it('should set the option value on the top menu and update the checkmark', () => {
            settings.chooseOption('speed', 0.5);

            expect(document.querySelector('[data-type="speed"] .bp-media-settings-value').textContent).to.equal('0.5');
            expect(document.querySelector('[data-type="speed"][data-value="1.0"]')).to.not.have.class('bp-media-settings-selected');
            expect(document.querySelector('[data-type="speed"][data-value="0.5"]')).to.have.class('bp-media-settings-selected');
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

            settings.blurHandler({ type: 'keydown', key: 'Space', target: document.querySelector('.bp-media-gear-icon') });

            expect(settings.hide).to.not.be.called;
        });

        it('should not hide if enter is pressed on settings button', () => {
            sandbox.stub(settings, 'hide');

            settings.blurHandler({ type: 'keydown', key: 'Enter', target: document.querySelector('.bp-media-gear-icon') });

            expect(settings.hide).to.not.be.called;
        });

        it('should not hide if click is on settings menu', () => {
            sandbox.stub(settings, 'hide');

            settings.blurHandler({ type: 'click', target: document.querySelector('.bp-media-settings-item') });

            expect(settings.hide).to.not.be.called;
        });

        it('should not hide if space is pressed on settings button', () => {
            sandbox.stub(settings, 'hide');

            settings.blurHandler({ type: 'keydown', key: 'Space', target: document.querySelector('.bp-media-settings-item') });

            expect(settings.hide).to.not.be.called;
        });

        it('should not hide if enter is pressed on settings button', () => {
            sandbox.stub(settings, 'hide');

            settings.blurHandler({ type: 'keydown', key: 'Enter', target: document.querySelector('.bp-media-settings-item') });

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
});
