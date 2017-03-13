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

    describe('destroy()', () => {
        it('should remove event listeners on settings element and document', () => {
            sandbox.stub(settings.settingsEl, 'removeEventListener');
            sandbox.stub(document, 'removeEventListener');

            settings.destroy();

            expect(settings.settingsEl.removeEventListener).to.be.calledWith('click', settings.menuClickHandler);
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
    });

    describe('reset()', () => {
        it('should reset the classes for the settings element', () => {
            settings.settingsEl.className = 'blah';

            settings.reset();

            expect(settings.settingsEl).to.have.class('bp-media-settings');
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

    describe('menuClickHandler()', () => {
        beforeEach(() => {
            sandbox.stub(settings, 'reset');
            sandbox.stub(settings, 'chooseOption');
        });

        it('should not do anything if click is not in the settings element', () => {
            sandbox.stub(settings, 'findParentDataType').returns(null);
            settings.menuClickHandler({});

            expect(settings.reset).to.not.be.called;
            expect(settings.chooseOption).to.not.be.called;
            expect(settings.settingsEl.className).to.equal('bp-media-settings');
        });

        it('should reset menu if main menu is clicked', () => {
            sandbox.stub(settings, 'findParentDataType').returns(document.querySelector('[data-type="menu"]'));
            settings.menuClickHandler({});

            expect(settings.reset).to.be.called;
            expect(settings.chooseOption).to.not.be.called;
            expect(settings.settingsEl.className).to.equal('bp-media-settings');
        });

        it('should choose option if sub menu option is clicked', () => {
            sandbox.stub(settings, 'findParentDataType').returns(document.querySelector('[data-type="speed"][data-value="2.0"]'));
            settings.menuClickHandler({});

            expect(settings.reset).to.not.be.called;
            expect(settings.chooseOption).to.be.calledWith('speed', '2.0');
            expect(settings.settingsEl.className).to.equal('bp-media-settings');
        });

        it('should go to sub menu if sub menu is clicked', () => {
            const type = 'speed';
            sandbox.stub(settings, 'findParentDataType').returns(document.querySelector(`.bp-media-settings-item-${type}`));
            settings.menuClickHandler({});

            expect(settings.reset).to.not.be.called;
            expect(settings.chooseOption).to.not.be.called;
            expect(settings.settingsEl).to.have.class(`bp-media-settings-show-${type}`);
        });
    });

    describe('chooseOption()', () => {
        it('should hide the menu, cache option, and emit chosen option', () => {
            sandbox.stub(settings, 'hide');
            sandbox.stub(cache, 'set');
            sandbox.stub(settings, 'emit');

            const type = 'speed';
            const value = 0.5;
            settings.chooseOption(type, value);

            expect(settings.hide).to.be.called;
            expect(cache.set).to.be.calledWith(`media-${type}`, value);
            expect(settings.emit).to.be.calledWith(type);
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

            settings.blurHandler({ target: document.querySelector('.container') });
            expect(settings.hide).to.be.called;
        });

        it('should not hide if click is inside settings element', () => {
            sandbox.stub(settings, 'hide');

            settings.blurHandler({ target: document.querySelector('.bp-media-settings-item') });
            expect(settings.hide).to.not.be.called;
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
        let clock;

        beforeEach(() => {
            clock = sinon.useFakeTimers();
        });

        afterEach(() => {
            clock.restore();
        });

        it('should add open class and asynchronously add a blur handler', () => {
            sandbox.stub(document, 'addEventListener');

            settings.show();
            clock.tick(1);

            expect(settings.visible).to.be.true;
            expect(settings.containerEl).to.have.class('bp-media-settings-is-open');
            expect(document.addEventListener).to.be.calledWith('click', settings.blurHandler);
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
        });
    });
});
