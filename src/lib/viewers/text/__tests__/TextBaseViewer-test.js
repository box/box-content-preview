/* eslint-disable no-unused-expressions */
import BaseViewer from '../../BaseViewer';
import Controls from '../../../Controls';
import TextBaseViewer from '../TextBaseViewer';
import ZoomControls from '../../../ZoomControls';
import * as file from '../../../file';
import { PERMISSION_DOWNLOAD } from '../../../constants';

let containerEl;
let textBase;
const sandbox = sinon.sandbox.create();

describe('lib/viewers/text/TextBaseViewer', () => {
    const setupFunc = BaseViewer.prototype.setup;

    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/text/__tests__/TextBaseViewer-test.html');
        containerEl = document.querySelector('.container');
        textBase = new TextBaseViewer({
            file: {
                id: 0,
            },
            container: containerEl,
        });

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: sandbox.mock() });
        textBase.containerEl = containerEl;
        textBase.setup();
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        Object.defineProperty(BaseViewer.prototype, 'setup', { value: setupFunc });
        if (typeof textBase.destroy === 'function') {
            textBase.destroy();
        }

        textBase = null;
    });

    describe('destroy()', () => {
        it('should destroy the controls if they exist', () => {
            textBase.controls = {
                destroy: sandbox.stub(),
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
            textBase.zoomControls = {
                setCurrentScale: sandbox.stub(),
                removeListener: sandbox.stub(),
            };
        });

        afterEach(() => {
            textBase.containerEl.removeChild(textEl);
        });

        it('should emit the zoom event', () => {
            sandbox.stub(textBase, 'emit');
            textBase.zoom();
            expect(textBase.emit).to.be.calledWith('zoom');
            expect(textBase.zoomControls.setCurrentScale).to.be.calledWith(1.0);
        });

        it('should increase font size when zooming in', () => {
            textBase.zoom('in');
            expect(textEl.style.fontSize).to.equal('110%');
            expect(textBase.zoomControls.setCurrentScale).to.be.calledWith(1.1);
        });

        it('should decrease font size when zooming out', () => {
            textBase.zoom('out');
            expect(textEl.style.fontSize).to.equal('90%');
            expect(textBase.zoomControls.setCurrentScale).to.be.calledWith(0.9);
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
        it('should add selectable/printable classes if user has download permissions', () => {
            sandbox
                .stub(file, 'checkPermission')
                .withArgs(textBase.options.file, PERMISSION_DOWNLOAD)
                .returns(true);
            textBase.load();

            expect(textBase.containerEl).to.have.class('bp-is-printable');
            expect(textBase.containerEl).to.have.class('bp-is-selectable');
        });

        it('should not add selectable/printable classes if user does not have download permissions', () => {
            sandbox
                .stub(file, 'checkPermission')
                .withArgs(textBase.options.file, PERMISSION_DOWNLOAD)
                .returns(false);
            textBase.load();

            expect(textBase.containerEl).to.not.have.class('bp-is-printable');
            expect(textBase.containerEl).to.not.have.class('bp-is-selectable');
        });

        it('should not add selectable/printable classes if disableTextViewer option is true', () => {
            sandbox
                .stub(file, 'checkPermission')
                .withArgs(textBase.options.file, PERMISSION_DOWNLOAD)
                .returns(true);
            sandbox
                .stub(textBase, 'getViewerOption')
                .withArgs('disableTextLayer')
                .returns(true);

            textBase.load();

            expect(textBase.containerEl).to.not.have.class('bp-is-printable');
            expect(textBase.containerEl).to.not.have.class('bp-is-selectable');
        });
    });

    describe('loadUI()', () => {
        const addFunc = Controls.prototype.add;
        const zoomInitFunc = ZoomControls.prototype.init;

        afterEach(() => {
            Object.defineProperty(Controls.prototype, 'add', { value: addFunc });
            Object.defineProperty(ZoomControls.prototype, 'init', { value: zoomInitFunc });
        });

        it('should setup controls and add click handlers', () => {
            Object.defineProperty(Controls.prototype, 'add', { value: sandbox.stub() });
            Object.defineProperty(ZoomControls.prototype, 'init', { value: sandbox.stub() });

            textBase.loadUI();
            expect(textBase.controls instanceof Controls).to.be.true;
            expect(Controls.prototype.add.callCount).to.equal(2);
            expect(Controls.prototype.add).to.be.calledWith(
                sinon.match.string,
                textBase.toggleFullscreen,
                sinon.match.string,
                sinon.match.string,
            );

            expect(textBase.zoomControls instanceof ZoomControls).to.be.true;
            expect(ZoomControls.prototype.init).to.be.calledWith(1, {
                maxZoom: 10,
                minZoom: 0.1,
                onZoomIn: textBase.zoomIn,
                onZoomOut: textBase.zoomOut,
                zoomInClassName: 'bp-text-zoom-in-icon',
                zoomOutClassName: 'bp-text-zoom-out-icon',
            });
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
