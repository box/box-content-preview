/* eslint-disable no-unused-expressions */
import fscreen from 'fscreen';
import fullscreen from '../Fullscreen';
import { CLASS_FULLSCREEN } from '../constants';

const sandbox = sinon.sandbox.create();

describe('lib/Fullscreen', () => {
    beforeEach(() => {
        sandbox.stub(fscreen, 'fullscreenElement').value(document.createElement('div'));
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    describe('isFullscreen()', () => {
        it('should return whether document is in fullscreen if true fullscreen is supported', () => {
            sandbox.stub(fullscreen, 'isSupported').returns(true);

            expect(fullscreen.isFullscreen()).to.be.true;

            sandbox.stub(fscreen, 'fullscreenElement').value(null);

            expect(fullscreen.isFullscreen()).to.be.false;
        });

        it('should return whether element has fullscreen class if true fullscreen is not supported', () => {
            sandbox.stub(fullscreen, 'isSupported').returns(false);
            sandbox.stub(fscreen, 'fullscreenElement').value(null);

            const element = document.createElement('div');
            element.classList.add(CLASS_FULLSCREEN);

            expect(fullscreen.isFullscreen(element)).to.be.true;

            element.classList.remove(CLASS_FULLSCREEN);
            expect(fullscreen.isFullscreen(element)).to.be.false;
        });
    });

    describe('fullscreenEnterHandler()', () => {
        it('should add the fullscreen class and focus the element', () => {
            const element = document.createElement('div');
            sandbox.stub(element, 'focus');
            sandbox.stub(fullscreen, 'emit');

            fullscreen.fullscreenEnterHandler(element);

            expect(element.classList.contains(CLASS_FULLSCREEN)).to.be.true;
            expect(element.focus).to.have.been.called;
            expect(fullscreen.emit).to.have.been.calledWith('enter');
        });
    });

    describe('fullscreenExitHandler()', () => {
        it('should remove the fullscreen class and not focus the element', () => {
            const element = document.createElement('div');
            element.classList.add(CLASS_FULLSCREEN);
            sandbox.stub(element, 'focus');
            sandbox.stub(fullscreen, 'emit');
            sandbox.stub(fullscreen, 'fullscreenElement').value(element);

            fullscreen.fullscreenExitHandler();

            expect(element.classList.contains(CLASS_FULLSCREEN)).to.be.false;
            expect(element.focus).not.to.have.been.called;
            expect(fullscreen.emit).to.have.been.calledWith('exit');
        });
    });

    describe('enter()', () => {
        beforeEach(() => {
            sandbox.stub(fullscreen, 'fullscreenEnterHandler');
            sandbox.stub(fullscreen, 'isFullscreen').returns(true);
        });

        it('should trigger native requestFullscreen handler if not in fullscreen and true fullscreen is supported', () => {
            const fullscreenStub = sandbox.stub();
            sandbox.stub(fscreen, 'requestFullscreenFunction').returns(fullscreenStub);
            sandbox.stub(fullscreen, 'isSupported').returns(true);

            const element = document.createElement('div');
            fullscreen.enter(element);

            expect(fullscreenStub).to.have.been.calledWith(Element.ALLOW_KEYBOARD_INPUT);
        });

        it('should trigger the fullscreenEnterHandler immediately if true fullscreen is not supported', () => {
            sandbox.stub(fullscreen, 'isSupported').returns(false);

            const element = document.createElement('div');
            fullscreen.enter(element);

            expect(fullscreen.fullscreenEnterHandler).to.have.been.called;
        });
    });

    describe('exit()', () => {
        beforeEach(() => {
            sandbox.stub(fullscreen, 'fullscreenElement').value(document.createElement('div'));
            sandbox.stub(fullscreen, 'fullscreenExitHandler');
            sandbox.stub(fullscreen, 'isFullscreen').returns(true);
        });

        it('should trigger native exitFullscreen handler if in fullscreen and true fullscreen is supported', () => {
            const exitFullscreen = sinon.stub();
            sandbox.stub(fscreen, 'exitFullscreen').value(exitFullscreen);
            sandbox.stub(fullscreen, 'isSupported').returns(true);

            fullscreen.exit();

            expect(exitFullscreen).to.have.been.called;
        });

        it('should trigger the fullscreenExitHandler immediately if true fullscreen is not supported', () => {
            sandbox.stub(fullscreen, 'isSupported').returns(false);

            fullscreen.exit();

            expect(fullscreen.fullscreenExitHandler).to.have.been.called;
        });
    });

    describe('toggle()', () => {
        beforeEach(() => {
            sandbox.stub(fullscreen, 'enter');
            sandbox.stub(fullscreen, 'exit');
            sandbox.stub(fullscreen, 'isSupported').returns(false);
        });

        it('should call enter if not already in fullscreen', () => {
            const element = document.createElement('div');

            fullscreen.toggle(element);

            expect(fullscreen.enter).to.have.been.called;
        });

        it('should call exit if already in fullscreen', () => {
            const element = document.createElement('div');
            element.classList.add(CLASS_FULLSCREEN);

            fullscreen.toggle(element);

            expect(fullscreen.exit).to.have.been.called;
        });
    });
});
