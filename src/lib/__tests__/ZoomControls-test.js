/* eslint-disable no-unused-expressions */
import ZoomControls from '../ZoomControls';
import Controls from '../Controls';
import { ICON_ZOOM_OUT, ICON_ZOOM_IN } from '../icons/icons';

let zoomControls;
let stubs = {};

const sandbox = sinon.sandbox.create();

describe('lib/ZoomControls', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('__tests__/ZoomControls-test.html');
        const controls = new Controls(document.getElementById('test-zoom-controls-container'));
        zoomControls = new ZoomControls(controls);
    });

    afterEach(() => {
        fixture.cleanup();
        sandbox.verifyAndRestore();

        zoomControls = null;
        stubs = {};
    });

    describe('constructor()', () => {
        it('should create the correct DOM structure', () => {
            expect(zoomControls.controlsElement).not.to.be.undefined;
        });

        it('should throw an exception if controls is not provided', () => {
            expect(() => new ZoomControls()).to.throw(Error, 'controls must be an instance of Controls');
        });
    });

    describe('init()', () => {
        beforeEach(() => {
            stubs.add = sandbox.stub(zoomControls.controls, 'add');
            stubs.setCurrentScale = sandbox.stub(zoomControls, 'setCurrentScale');
            stubs.onZoomIn = sandbox.stub();
            stubs.onZoomOut = sandbox.stub();
        });

        it('should add the controls', () => {
            zoomControls.init(0.5, { onZoomIn: stubs.onZoomIn, onZoomOut: stubs.onZoomOut });

            expect(stubs.add).to.be.calledWith(
                __('zoom_out'),
                stubs.onZoomOut,
                'bp-controls-group-btn bp-zoom-btn bp-zoom-out-btn ',
                ICON_ZOOM_OUT,
                undefined,
                sinon.match.any,
            );
            expect(stubs.add).to.be.calledWith(
                __('zoom_current_scale'),
                undefined,
                'bp-ZoomControls-currentScale',
                sinon.match.string,
                'div',
                sinon.match.any,
            );
            expect(stubs.add).to.be.calledWith(
                __('zoom_in'),
                stubs.onZoomIn,
                'bp-controls-group-btn bp-zoom-btn bp-zoom-in-btn ',
                ICON_ZOOM_IN,
                undefined,
                sinon.match.any,
            );
            expect(zoomControls.currentScaleElement).not.to.be.undefined;
            expect(stubs.setCurrentScale).to.be.calledWith(0.5);
            expect(zoomControls.maxZoom).to.be.equal(Number.POSITIVE_INFINITY);
            expect(zoomControls.minZoom).to.be.equal(10);
        });

        it('should set the min and max zooms if specified', () => {
            zoomControls.init(0.5, { minZoom: 0.5, maxZoom: 5 });

            expect(zoomControls.maxZoom).to.be.equal(500);
            expect(zoomControls.minZoom).to.be.equal(50);
        });

        it('should set the min zoom to 0 if negative is provided', () => {
            zoomControls.init(0.5, { minZoom: -0.2, maxZoom: 5 });

            expect(zoomControls.maxZoom).to.be.equal(500);
            expect(zoomControls.minZoom).to.be.equal(10);
        });

        it('should set the min zoom to 0.1 if number is not provided', () => {
            zoomControls.init(0.5, { minZoom: '0.2', maxZoom: 5 });

            expect(zoomControls.maxZoom).to.be.equal(500);
            expect(zoomControls.minZoom).to.be.equal(10);
        });

        it('should set the max zoom to Number.POSITIVE_INFINITY if number is not provided', () => {
            zoomControls.init(0.5, { minZoom: 0.5, maxZoom: '100' });

            expect(zoomControls.maxZoom).to.be.equal(Number.POSITIVE_INFINITY);
            expect(zoomControls.minZoom).to.be.equal(50);
        });

        it('should set optional classnames if specified', () => {
            zoomControls.init(0.5, {
                zoomInClassName: 'zoom-in-classname',
                zoomOutClassName: 'zoom-out-classname',
                onZoomIn: stubs.onZoomIn,
                onZoomOut: stubs.onZoomOut,
            });

            expect(stubs.add).to.be.calledWith(
                __('zoom_out'),
                stubs.onZoomOut,
                'bp-controls-group-btn bp-zoom-btn bp-zoom-out-btn zoom-out-classname',
                ICON_ZOOM_OUT,
                undefined,
                sinon.match.any,
            );
            expect(stubs.add).to.be.calledWith(
                __('zoom_current_scale'),
                undefined,
                'bp-ZoomControls-currentScale',
                sinon.match.string,
                'div',
                sinon.match.any,
            );
            expect(stubs.add).to.be.calledWith(
                __('zoom_in'),
                stubs.onZoomIn,
                'bp-controls-group-btn bp-zoom-btn bp-zoom-in-btn zoom-in-classname',
                ICON_ZOOM_IN,
                undefined,
                sinon.match.any,
            );
        });
    });

    describe('setCurrentScale()', () => {
        beforeEach(() => {
            stubs.checkButtonEnablement = sandbox.stub(zoomControls, 'checkButtonEnablement');
            zoomControls.currentScaleElement = document.createElement('span');
            zoomControls.currentScaleElement.textContent = '100%';
        });

        it('should not do anything if scale is not provided', () => {
            zoomControls.setCurrentScale();

            expect(zoomControls.currentScale).to.be.undefined;
            expect(zoomControls.currentScaleElement.textContent).to.be.equal('100%');
            expect(stubs.checkButtonEnablement).not.to.be.called;
        });

        it('should not do anything if scale is not a number', () => {
            zoomControls.setCurrentScale('100');

            expect(zoomControls.currentScale).to.be.undefined;
            expect(zoomControls.currentScaleElement.textContent).to.be.equal('100%');
            expect(stubs.checkButtonEnablement).not.to.be.called;
        });

        it('should set the scale and update the text', () => {
            zoomControls.setCurrentScale(0.5);

            expect(zoomControls.currentScale).to.be.equal(50);
            expect(zoomControls.currentScaleElement.textContent).to.be.equal('50%');
            expect(stubs.checkButtonEnablement).to.be.called;
        });
    });

    describe('checkButtonEnablement()', () => {
        it('should do nothing if currentScale is not at the limits', () => {
            zoomControls.init(0.5, { maxZoom: 5, minZoom: 0.3 });
            zoomControls.checkButtonEnablement();

            expect(zoomControls.controlsElement.querySelector('.bp-zoom-out-btn').disabled).to.be.false;
            expect(zoomControls.controlsElement.querySelector('.bp-zoom-in-btn').disabled).to.be.false;
        });

        it('should disable zoom out if currentScale is at the minZoom limit', () => {
            zoomControls.init(0.3, { maxZoom: 5, minZoom: 0.3 });
            zoomControls.checkButtonEnablement();

            expect(zoomControls.controlsElement.querySelector('.bp-zoom-out-btn').disabled).to.be.true;
            expect(zoomControls.controlsElement.querySelector('.bp-zoom-in-btn').disabled).to.be.false;
        });

        it('should disable zoom in if currentScale is at the maxZoom limit', () => {
            zoomControls.init(5, { maxZoom: 5, minZoom: 0.3 });
            zoomControls.checkButtonEnablement();

            expect(zoomControls.controlsElement.querySelector('.bp-zoom-out-btn').disabled).to.be.false;
            expect(zoomControls.controlsElement.querySelector('.bp-zoom-in-btn').disabled).to.be.true;
        });
    });
});
