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

    describe('fullscreenchangeHandler()', () => {
        before(() => {
            fixture.setBase('src/lib');
        });

        beforeEach(() => {
            fixture.load('__tests__/Fullscreen-test.html');
        });

        afterEach(() => {
            fixture.cleanup();
        });

        it('should emit enter if we are entering fullscreen and if true fullscreen is supported', () => {
            sandbox.stub(fullscreen, 'isSupported').returns(true);
            sandbox.stub(fullscreen, 'isFullscreen').returns(true);
            sandbox.stub(fullscreen, 'emit');
            sandbox.stub(fullscreen, 'focusFullscreenElement');

            fullscreen.fullscreenchangeHandler();

            expect(fullscreen.emit).to.have.been.calledWith('enter');
            expect(fullscreen.focusFullscreenElement).to.have.been.called;
        });

        it('should emit exit if we are exiting fullscreen and if true fullscreen is supported', () => {
            sandbox.stub(fullscreen, 'isSupported').returns(true);
            sandbox.stub(fullscreen, 'isFullscreen').returns(false);
            sandbox.stub(fullscreen, 'emit');
            sandbox.stub(fullscreen, 'focusFullscreenElement');

            fullscreen.fullscreenchangeHandler();

            expect(fullscreen.emit).to.have.been.calledWith('exit');
            expect(fullscreen.focusFullscreenElement).not.to.have.been.called;
        });

        it('should emit enter if we are entering fullscreen and if true fullscreen is not supported', () => {
            sandbox.stub(fullscreen, 'isSupported').returns(false);
            sandbox.stub(fullscreen, 'isFullscreen').returns(true);
            sandbox.stub(fullscreen, 'emit');
            sandbox.stub(fullscreen, 'focusFullscreenElement');

            fullscreen.fullscreenchangeHandler();

            expect(fullscreen.emit).to.have.been.calledWith('enter');
        });

        it('should emit exit if we are exiting fullscreen and if true fullscreen is not supported', () => {
            sandbox.stub(fullscreen, 'isSupported').returns(false);
            sandbox.stub(fullscreen, 'isFullscreen').returns(false);
            sandbox.stub(fullscreen, 'emit');

            fullscreen.fullscreenchangeHandler();

            expect(fullscreen.emit).to.have.been.calledWith('exit');
        });
    });

    describe('enter', () => {
        it('should add the fullscreen class', () => {
            const element = document.createElement('div');

            fullscreen.enter(element);

            expect(element.classList.contains(CLASS_FULLSCREEN)).to.be.true;
        });
    });

    describe('exit', () => {
        it('should remove the fullscreen class', () => {
            const element = document.createElement('div');
            element.classList.add(CLASS_FULLSCREEN);

            fullscreen.enter(element);

            expect(element.classList.contains(CLASS_FULLSCREEN)).to.be.true;
        });
    });

    describe('toggle()', () => {
        it('should trigger native exitFullscreen handler if in fullscreen and true fullscreen is supported', () => {
            const exitFullscreen = sinon.stub();
            sandbox.stub(fscreen, 'exitFullscreen').value(exitFullscreen);
            sandbox.stub(fullscreen, 'isSupported').returns(true);
            sandbox.stub(fullscreen, 'isFullscreen').returns(true);

            fullscreen.toggle({});

            expect(exitFullscreen).to.have.been.called;
        });

        it('should trigger native requestFullscreen handler if not in fullscreen and true fullscreen is supported', () => {
            const element = document.createElement('div');
            const fullscreenStub = sandbox.stub();
            sandbox.stub(fscreen, 'requestFullscreenFunction').returns(fullscreenStub);
            sandbox.stub(fullscreen, 'isSupported').returns(true);
            sandbox.stub(fullscreen, 'isFullscreen').returns(false);

            fullscreen.toggle(element);

            expect(fullscreenStub).to.have.been.calledWith(Element.ALLOW_KEYBOARD_INPUT);
        });
    });

    describe('focusFullscreenElement()', () => {
        it('should focus the element when event is passed in', () => {
            const element = document.createElement('div');
            sandbox.stub(element, 'focus');
            sandbox.stub(fscreen, 'fullscreenElement').value(element);

            fullscreen.toggle(element);
            fullscreen.focusFullscreenElement();

            expect(fscreen.fullscreenElement.focus.called).to.be.true;
        });
    });
});
