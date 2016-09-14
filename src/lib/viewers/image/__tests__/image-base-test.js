/* eslint-disable no-unused-expressions */
import ImageBase from '../image-base';
import Base from '../../base.js';

const sandbox = sinon.sandbox.create();
let imageBase;
let containerEl;

describe('image-base', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/image/__tests__/image-base-test.html');

        containerEl = document.querySelector('.container');
        imageBase = new ImageBase(containerEl);
        imageBase.containerEl = containerEl;
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();
    });

    describe('destroy()', () => {
        it('should cleanup the image base viewer', () => {
            imageBase.loadUI();
            imageBase.imageEl = document.createElement('div');
            imageBase.imageEl.addEventListener('mouseup', imageBase.handleMouseUp);

            sandbox.stub(imageBase.controls, 'destroy');
            sandbox.stub(imageBase.imageEl, 'removeEventListener');

            Object.defineProperty(Object.getPrototypeOf(ImageBase.prototype), 'destroy', {
                value: sandbox.stub()
            });

            imageBase.destroy();

            expect(imageBase.controls.destroy).to.have.been.called;
            expect(imageBase.imageEl.removeEventListener).to.have.been.calledWith('mouseup', imageBase.handleMouseUp);
            expect(Base.prototype.destroy).to.have.been.called;
        });
    });

    describe('zoomIn()', () => {
        it('should zoom in image', () => {
            sandbox.stub(imageBase, 'zoom');

            imageBase.zoomIn();

            expect(imageBase.zoom).to.have.been.calledWith('in');
        });
    });

    describe('zoomOut()', () => {
        it('should zoom out image', () => {
            sandbox.stub(imageBase, 'zoom');

            imageBase.zoomOut();

            expect(imageBase.zoom).to.have.been.calledWith('out');
        });
    });

    describe('resize()', () => {
        it('should resize image', () => {
            sandbox.stub(imageBase, 'zoom');

            Object.defineProperty(Object.getPrototypeOf(ImageBase.prototype), 'resize', {
                value: sandbox.stub()
            });

            imageBase.resize();

            expect(imageBase.zoom).to.have.been.called;
            expect(Base.prototype.resize).to.have.been.called;
        });
    });

    describe('loadUI()', () => {
        it('should create controls and add 2 control buttons for zoom', () => {
            imageBase.loadUI();

            expect(imageBase.controls).to.not.be.undefined;
            expect(imageBase.controls.buttonRefs.length).to.equal(2);
        });
    });

    describe('onKeydown', () => {
        it('should return false when media controls are not ready or are focused', () => {
            const consumed = imageBase.onKeydown();

            expect(consumed).to.be.false;
        });

        it('should zoom in and return true when zoom in short cut is triggered', () => {
            imageBase.loadUI();

            sandbox.stub(imageBase, 'zoomIn');

            const consumed = imageBase.onKeydown('Shift++');

            expect(imageBase.zoomIn).to.have.been.called;
            expect(consumed).to.be.true;
        });

        it('should zoom in and return true when zoom out short cut is triggered', () => {
            imageBase.loadUI();

            sandbox.stub(imageBase, 'zoomOut');

            const consumed = imageBase.onKeydown('Shift+_');

            expect(imageBase.zoomOut).to.have.been.called;
            expect(consumed).to.be.true;
        });

        it('should return false if neither zoom keyboard short cuts are triggered', () => {
            imageBase.loadUI();

            sandbox.stub(imageBase, 'zoomIn');
            sandbox.stub(imageBase, 'zoomOut');

            const consumed = imageBase.onKeydown();

            expect(imageBase.zoomIn).to.not.have.been.called;
            expect(imageBase.zoomOut).to.not.have.been.called;
            expect(consumed).to.be.false;
        });
    });
});
