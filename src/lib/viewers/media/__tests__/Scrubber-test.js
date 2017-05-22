/* eslint-disable no-unused-expressions */
import Scrubber from '../Scrubber';

let scrubber;
let stubs = {};
const CLASS_SCRUBBER_HOVER = 'bp-media-scrubber-hover';
const sandbox = sinon.sandbox.create();

describe('lib/viewers/media/Scrubber', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/media/__tests__/Scrubber-test.html');
        const containerEl = document.querySelector('.container');
        scrubber = new Scrubber(containerEl, 'Scrubbah', '0', '10');
    });

    afterEach(() => {
        sandbox.verifyAndRestore();

        if (scrubber && typeof scrubber.destroy === 'function') {
            scrubber.destroy();
        }

        scrubber = null;
        stubs = {};
    });

    describe('Scrubber()', () => {
        it('should set up scrubber element', () => {
            expect(scrubber.containerEl).to.not.be.empty;
            expect(scrubber.containerEl.getAttribute('role')).to.equal('slider');
            expect(scrubber.containerEl.getAttribute('aria-label')).to.equal('Scrubbah');
            expect(scrubber.containerEl.getAttribute('title')).to.equal('Scrubbah');
            expect(scrubber.containerEl.getAttribute('aria-valuemin')).to.equal('0');
            expect(scrubber.containerEl.getAttribute('aria-valuemax')).to.equal('10');
            expect(scrubber.value).to.equal(0);
            expect(scrubber.convertedValue).to.equal(1);
            expect(scrubber.bufferedValue).to.equal(1);
        });
    });

    describe('destroy()', () => {
        it('should remove event listeners on the scrubber', () => {
            sandbox.stub(scrubber, 'removeAllListeners');
            sandbox.stub(scrubber, 'destroyDocumentHandlers');

            stubs.played = sandbox.stub(scrubber.playedEl, 'removeEventListener');
            stubs.converted = sandbox.stub(scrubber.convertedEl, 'removeEventListener');
            stubs.handle = sandbox.stub(scrubber.handleEl, 'removeEventListener');

            scrubber.destroy();

            expect(scrubber.removeAllListeners).to.be.called;
            expect(scrubber.destroyDocumentHandlers).to.be.called;
            expect(stubs.played).to.be.calledWith('mousedown');
            expect(stubs.converted).to.be.calledWith('mousedown');
            expect(stubs.handle).to.be.calledWith('mousedown');
            expect(scrubber.containerEl).to.be.empty;

            // Ensures that afterEach() cleanup doesn't trigger destroy() again
            scrubber = null;
        });
    });

    describe('resize()', () => {
        it('should resize the scrubber accordingly to the provided offset', () => {
            scrubber.containerEl.style.width = '25px';
            scrubber.resize(10);

            expect(scrubber.scrubberWrapperEl.style.width).to.equal('15px');
        });
    });

    describe('setValue()', () => {
        it('should do nothing if the scrubber handle position value has not changed', () => {
            const oldPos = scrubber.handleEl.style.left;
            scrubber.setValue();

            expect(scrubber.handleEl.style.left).to.equal(oldPos);
        });

        it('set the new scrubber value', () => {
            scrubber.convertedValue = 0.5;
            scrubber.setValue(0.25);

            expect(scrubber.value).to.equal(0.25);
            expect(scrubber.handleEl.style.left).to.equal('25%');
        });
    });

    describe('setBufferedValue()', () => {
        it('should do nothing if the scrubber buffered value has not changed', () => {
            scrubber.setBufferedValue();
            expect(scrubber.bufferedValue).to.equal(1);
        });

        it('should set the scrubber buffered value', () => {
            scrubber.value = 0.25;
            scrubber.convertedValue = 0.75;
            scrubber.setBufferedValue(0.5);
            expect(scrubber.bufferedValue).to.equal(0.5);
        });
    });

    describe('setConvertedValue()', () => {
        it('should do nothing if the scrubber converted value has not changed', () => {
            scrubber.setConvertedValue();
        });

        it('should set the scrubber converted value', () => {
            scrubber.value = 0.25;
            scrubber.convertedValue = 0.45;
            scrubber.setConvertedValue(0.5);
            expect(scrubber.convertedValue).to.equal(0.5);
        });
    });

    describe('scrubbingHandler()', () => {
        it('should adjust the scrubber value to the current scrubber handle position value in the video', () => {
            stubs.setValue = sandbox.stub(scrubber, 'setValue');
            stubs.emit = sandbox.stub(scrubber, 'emit');
            stubs.scrubberPosition = sandbox.stub(scrubber, 'computeScrubberPosition').returns(0.5);

            scrubber.scrubbingHandler({ pageX: 50 });

            expect(stubs.scrubberPosition).to.be.calledWith(50);
            expect(stubs.setValue).to.be.calledWith(0.5);
            expect(stubs.emit).to.be.calledWith('valuechange');
        });
    });

    describe('computeScrubberPosition()', () => {
        it('should compute correct scrubber position', () => {
            sandbox.stub(scrubber.scrubberEl, 'getBoundingClientRect').returns({
                left: 20,
                width: 100
            });

            const position = scrubber.computeScrubberPosition(30);

            expect(position).to.equal(0.1);
        });

        it('should cap the scrubber position to 1', () => {
            sandbox.stub(scrubber.scrubberEl, 'getBoundingClientRect').returns({
                left: 20,
                width: 100
            });

            const position = scrubber.computeScrubberPosition(130);

            expect(position).to.equal(1);
        });

        it('should floor the scrubber position to 0', () => {
            sandbox.stub(scrubber.scrubberEl, 'getBoundingClientRect').returns({
                left: 20,
                width: 100
            });

            const position = scrubber.computeScrubberPosition(10);

            expect(position).to.equal(0);
        });
    });

    describe('mouseDownHandler()', () => {
        beforeEach(() => {
            stubs.scrub = sandbox.stub(scrubber, 'scrubbingHandler');
            stubs.event = {
                button: 5,
                ctrlKey: undefined,
                metaKey: undefined,
                preventDefault: sandbox.stub()
            };
        });

        it('should ignore if event is not a left click', () => {
            scrubber.mouseDownHandler(stubs.event);
            expect(stubs.scrub).to.not.be.called;
        });

        it('should ignore if event is a CTRL click', () => {
            stubs.event.ctrlKey = '';
            scrubber.mouseDownHandler(stubs.event);
            expect(stubs.scrub).to.not.be.called;
        });

        it('should ignore if event is a CMD click', () => {
            stubs.event.metaKey = '';
            scrubber.mouseDownHandler(stubs.event);
            expect(stubs.scrub).to.not.be.called;
        });

        it('should set the mouse move state to true and calls the mouse action handler', () => {
            stubs.event.button = 1;
            scrubber.mouseDownHandler(stubs.event);

            expect(stubs.scrub).to.be.calledWith(stubs.event);
            expect(scrubber.scrubberWrapperEl).to.have.class(CLASS_SCRUBBER_HOVER);
        });
    });

    describe('mouseUpHandler()', () => {
        it('should set the mouse move state to false thus stopping mouse action handling', () => {
            stubs.destroy = sandbox.stub(scrubber, 'destroyDocumentHandlers');
            scrubber.mouseUpHandler(stubs.event);
            expect(stubs.destroy).to.be.called;
            expect(scrubber.scrubberWrapperEl).to.not.have.class(CLASS_SCRUBBER_HOVER);
        });
    });

    describe('destroyDocumentHandlers()', () => {
        it('should remove event listeners', () => {
            stubs.remove = sandbox.stub(document, 'removeEventListener');
            scrubber.destroyDocumentHandlers();

            expect(stubs.remove).to.be.calledWith('mousemove', scrubber.scrubbingHandler);
            expect(stubs.remove).to.be.calledWith('mouseup', scrubber.mouseUpHandler);
            expect(stubs.remove).to.be.calledWith('mouseleave', scrubber.mouseUpHandler);
        });
    });

    describe('getValue()', () => {
        it('should get the value of the scrubble handle position', () => {
            expect(scrubber.getValue()).to.equal(scrubber.value);
        });
    });

    describe('getHandleEl()', () => {
        it('should get the dom element for the scrubber handle', () => {
            expect(scrubber.getHandleEl()).to.equal(scrubber.handleEl);
        });
    });

    describe('getConvertedEl()', () => {
        it('should get the dom element for the scrubber conversion bar', () => {
            expect(scrubber.getConvertedEl()).to.equal(scrubber.convertedEl);
        });
    });
});
