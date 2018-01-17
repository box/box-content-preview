/* eslint-disable no-unused-expressions */
import fullscreen from '../Fullscreen';
import { CLASS_FULLSCREEN } from '../constants';

const sandbox = sinon.sandbox.create();

describe('lib/Fullscreen', () => {
    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    describe('isFullscreen()', () => {
        it('should return whether document is in fullscreen if true fullscreen is supported', () => {
            sandbox.stub(fullscreen, 'isSupported').returns(true);

            Object.defineProperty(document, 'fullscreenElement', {
                value: document.createElement('div'),
                writable: true
            });

            expect(fullscreen.isFullscreen({})).to.be.true;

            document.fullscreenElement = null;

            expect(fullscreen.isFullscreen({})).to.be.false;
        });

        it('should return whether element has fullscreen class if true fullscreen is not supported', () => {
            sandbox.stub(fullscreen, 'isSupported').returns(false);
            const element = document.createElement('div');
            element.classList.add(CLASS_FULLSCREEN);

            expect(fullscreen.isFullscreen(element)).to.be.true;

            element.classList.remove(CLASS_FULLSCREEN);
            expect(fullscreen.isFullscreen(element)).to.be.false;
        });
    });

    describe('fullscreenchangeHandler()', () => {
        it('should emit enter if we are entering fullscreen and if true fullscreen is supported', () => {
            sandbox.stub(fullscreen, 'isSupported').returns(true);
            sandbox.stub(fullscreen, 'isFullscreen').returns(true);
            sandbox.stub(fullscreen, 'emit');

            fullscreen.fullscreenchangeHandler({});

            expect(fullscreen.emit).to.have.been.calledWith('enter');
        });

        it('should emit exit if we are exiting fullscreen and if true fullscreen is supported', () => {
            sandbox.stub(fullscreen, 'isSupported').returns(true);
            sandbox.stub(fullscreen, 'isFullscreen').returns(false);
            sandbox.stub(fullscreen, 'emit');

            fullscreen.fullscreenchangeHandler({});

            expect(fullscreen.emit).to.have.been.calledWith('exit');
        });

        it('should emit enter if we are entering fullscreen and if true fullscreen is not supported', () => {
            sandbox.stub(fullscreen, 'isSupported').returns(false);
            sandbox.stub(fullscreen, 'isFullscreen').returns(false);
            sandbox.stub(fullscreen, 'emit');

            fullscreen.fullscreenchangeHandler({});

            expect(fullscreen.emit).to.have.been.calledWith('enter');
        });

        it('should emit exit if we are exiting fullscreen and if true fullscreen is not supported', () => {
            sandbox.stub(fullscreen, 'isSupported').returns(false);
            sandbox.stub(fullscreen, 'isFullscreen').returns(true);
            sandbox.stub(fullscreen, 'emit');

            fullscreen.fullscreenchangeHandler({});

            expect(fullscreen.emit).to.have.been.calledWith('exit');
        });

        it('should be called only once when the fullscreenchange event is emitted', () => {
            const spy = sandbox.spy(fullscreen, 'fullscreenchangeHandler');
            //rebind the dom listeners to use the spy
            fullscreen.bindDOMListeners();

            const event = new Event('webkitfullscreenchange');

            window.document.dispatchEvent(event);
            expect(spy).to.be.called.once;
        });
    });

    describe('toggle()', () => {
        it('should trigger native exitFullscreen handler if in fullscreen and true fullscreen is supported', () => {
            sandbox.stub(fullscreen, 'isSupported').returns(true);
            sandbox.stub(fullscreen, 'isFullscreen').returns(true);

            const exitStub = sandbox.stub();
            document.exitFullscreen = exitStub;

            fullscreen.toggle({});

            expect(exitStub).to.have.been.called;
        });

        it('should trigger native msExitFullscreen handler if in fullscreen and true fullscreen is supported', () => {
            sandbox.stub(fullscreen, 'isSupported').returns(true);
            sandbox.stub(fullscreen, 'isFullscreen').returns(true);

            const exitStub = sandbox.stub();
            document.exitFullscreen = null;
            document.msExitFullscreen = exitStub;

            fullscreen.toggle({});

            expect(exitStub).to.have.been.called;
        });

        it('should trigger native mozCancelFullScreen handler if in fullscreen and true fullscreen is supported', () => {
            sandbox.stub(fullscreen, 'isSupported').returns(true);
            sandbox.stub(fullscreen, 'isFullscreen').returns(true);

            const exitStub = sandbox.stub();
            document.exitFullscreen = null;
            document.msExitFullscreen = null;
            document.mozCancelFullScreen = exitStub;

            fullscreen.toggle({});

            expect(exitStub).to.have.been.called;
        });

        it('should trigger native webkitExitFullscreen handler if in fullscreen and true fullscreen is supported', () => {
            sandbox.stub(fullscreen, 'isSupported').returns(true);
            sandbox.stub(fullscreen, 'isFullscreen').returns(true);

            const exitStub = sandbox.stub();
            document.exitFullscreen = null;
            document.msExitFullscreen = null;
            document.mozCancelFullScreen = null;
            document.webkitExitFullscreen = exitStub;

            fullscreen.toggle({});

            expect(exitStub).to.have.been.called;
        });

        it('should trigger native requestFullscreen handler if not in fullscreen and true fullscreen is supported', () => {
            const element = document.createElement('div');
            sandbox.stub(fullscreen, 'isSupported').returns(true);
            sandbox.stub(fullscreen, 'isFullscreen').returns(false);

            const enterStub = sandbox.stub();
            element.requestFullscreen = enterStub;

            fullscreen.toggle(element);

            expect(enterStub).to.have.been.called;
        });

        it('should trigger native msRequestFullscreen handler if not in fullscreen and true fullscreen is supported', () => {
            const element = document.createElement('div');
            sandbox.stub(fullscreen, 'isSupported').returns(true);
            sandbox.stub(fullscreen, 'isFullscreen').returns(false);

            const enterStub = sandbox.stub();
            element.requestFullscreen = null;
            element.msRequestFullscreen = enterStub;

            fullscreen.toggle(element);

            expect(enterStub).to.have.been.called;
        });

        it('should trigger native mozRequestFullScreen handler if not in fullscreen and true fullscreen is supported', () => {
            const element = document.createElement('div');
            sandbox.stub(fullscreen, 'isSupported').returns(true);
            sandbox.stub(fullscreen, 'isFullscreen').returns(false);

            const enterStub = sandbox.stub();
            element.requestFullscreen = null;
            element.msRequestFullscreen = null;
            element.mozRequestFullScreen = enterStub;

            fullscreen.toggle(element);

            expect(enterStub).to.have.been.called;
        });

        it('should trigger native webkitRequestFullscreen handler if not in fullscreen and true fullscreen is supported', () => {
            const element = document.createElement('div');
            sandbox.stub(fullscreen, 'isSupported').returns(true);
            sandbox.stub(fullscreen, 'isFullscreen').returns(false);

            const enterStub = sandbox.stub();
            element.requestFullscreen = null;
            element.msRequestFullscreen = null;
            element.mozRequestFullScreen = null;
            element.webkitRequestFullscreen = enterStub;

            fullscreen.toggle(element);

            expect(enterStub).to.have.been.called;
        });

        it('should trigger fullscreenchangeHandler if true fullscreen is not supported', () => {
            const element = document.createElement('div');
            sandbox.stub(fullscreen, 'isSupported').returns(false);
            sandbox.stub(fullscreen, 'fullscreenchangeHandler');

            fullscreen.toggle(element);

            expect(fullscreen.fullscreenchangeHandler).to.have.been.calledWith(element);
        });
    });
});
