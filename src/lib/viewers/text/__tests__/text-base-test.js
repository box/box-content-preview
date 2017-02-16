/* eslint-disable no-unused-expressions */
import Controls from '../../../controls';
import TextBase from '../text-base';

let containerEl;
let textBase;
const sandbox = sinon.sandbox.create();

describe('lib/viewers/text/text-base', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/text/__tests__/text-base-test.html');
        containerEl = document.querySelector('.container');
        textBase = new TextBase({
            file: {
                id: 0
            },
            container: containerEl
        });
        textBase.setup();
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        if (typeof textBase.destroy === 'function') {
            textBase.destroy();
        }

        textBase = null;
    });

    describe('destroy()', () => {
        it('should destroy the controls if they exist', () => {
            textBase.controls = {
                destroy: sandbox.stub()
            };

            textBase.destroy();
            expect(textBase.controls.destroy).to.be.called;
        });
    });

    describe('zoom()', () => {
        let textEl;

        beforeEach(() => {
            textEl = document.createElement('div');
            textEl.className = 'bp-text';
            textBase.containerEl.appendChild(textEl);
        });

        afterEach(() => {
            textBase.containerEl.removeChild(textEl);
        });

        it('should emit the zoom event', () => {
            sandbox.stub(textBase, 'emit');
            textBase.zoom();
            expect(textBase.emit).to.be.calledWith('zoom');
        });

        it('should increase font size when zooming in', () => {
            textBase.zoom('in');
            expect(textEl.style.fontSize).to.equal('110%');
        });

        it('should decrease font size when zooming out', () => {
            textBase.zoom('out');
            expect(textEl.style.fontSize).to.equal('90%');
        });
    });

    describe('zoomIn() / zoomOut()', () => {
        it('should call zoom() with appropriate parameter', () => {
            sandbox.stub(textBase, 'zoom');

            textBase.zoomIn();
            expect(textBase.zoom).to.be.calledWith('in');

            textBase.zoomOut();
            expect(textBase.zoom).to.be.calledWith('out');
        });
    });

    describe('load()', () => {
        it('should add selectable class if user has download permissions', () => {
            textBase.options.file.permissions = {
                can_download: true
            };

            textBase.load();
            expect(textBase.containerEl.classList.contains('bp-is-selectable')).to.be.true;
        });
    });

    describe('loadUI()', () => {
        const addFunc = Controls.prototype.add;

        afterEach(() => {
            Object.defineProperty(Controls.prototype, 'add', { value: addFunc });
        });

        it('should setup controls and add click handlers', () => {
            Object.defineProperty(Controls.prototype, 'add', { value: sandbox.stub() });

            textBase.loadUI();
            expect(textBase.controls instanceof Controls).to.be.true;
            expect(Controls.prototype.add.callCount).to.equal(4);
            expect(Controls.prototype.add).to.be.calledWith(sinon.match.string, textBase.zoomOut, sinon.match.string, sinon.match.string);
            expect(Controls.prototype.add).to.be.calledWith(sinon.match.string, textBase.zoomIn, sinon.match.string, sinon.match.string);
            expect(Controls.prototype.add).to.be.calledWith(sinon.match.string, textBase.toggleFullscreen, sinon.match.string, sinon.match.string);
        });
    });

    describe('onKeydown()', () => {
        it('should return false if controls are not initialized', () => {
            expect(textBase.onKeydown()).to.be.false;
        });

        it('should call zoomIn() for Shift++', () => {
            textBase.controls = {};
            sandbox.stub(textBase, 'zoomIn');
            expect(textBase.onKeydown('Shift++')).to.be.true;
            expect(textBase.zoomIn).to.be.called;
        });

        it('should call zoomOut() for Shift+_', () => {
            textBase.controls = {};
            sandbox.stub(textBase, 'zoomOut');
            expect(textBase.onKeydown('Shift+_')).to.be.true;
            expect(textBase.zoomOut).to.be.called;
        });

        it('should return false for other keypresses', () => {
            textBase.controls = {};
            expect(textBase.onKeydown('blah')).to.be.false;
        });
    });
});
