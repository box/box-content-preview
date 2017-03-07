/* eslint-disable no-unused-expressions */
import Scrubber from '../scrubber';

let scrubber;
let stubs = {};
const CLASS_SCRUBBER_HOVER = 'bp-media-scrubber-hover';
const sandbox = sinon.sandbox.create();

describe('scrubber', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/media/__tests__/scrubber-test.html');
        const containerEl = document.querySelector('.container');
        scrubber = new Scrubber(containerEl, '');
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
            stubs.adjust = sandbox.stub(scrubber, 'adjustScrubberHandle');

            scrubber.containerEl.style.width = '25px';
            scrubber.resize(10);

            expect(stubs.adjust).to.be.called;
            expect(scrubber.scrubberWrapperEl.style.width).to.equal('15px');
        });
    });

    describe('adjustScrubberHandle()', () => {
        it('should adjust the scrubber handle position to the current scrubber handle position value in the video', () => {
            scrubber.scrubberEl.style.width = '25px';
            scrubber.value = 0.5;
            scrubber.adjustScrubberHandle();

            expect(scrubber.handleEl.style.left).to.equal('18%');
        });
    });

    describe('setValue()', () => {
        it('should do nothing if the scrubber handle position value has not changed', () => {
            stubs.adjust = sandbox.stub(scrubber, 'adjustScrubberHandle');
            scrubber.setValue();

            expect(stubs.adjust).to.not.be.called;
        });

        it('set the new scrubber value', () => {
            stubs.adjust = sandbox.stub(scrubber, 'adjustScrubberHandle');
            scrubber.convertedValue = 0.5;
            scrubber.setValue(0.25);

            expect(scrubber.value).to.equal(0.25);
            expect(stubs.adjust).to.be.called;
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
        it('should adjust the scrubber handle position to the current scrubber handle position value in the video', () => {
            stubs.setValue = sandbox.stub(scrubber, 'setValue');
            stubs.emit = sandbox.stub(scrubber, 'emit');
            scrubber.scrubberEl.style.width = '25px';
            scrubber.scrubbingHandler({ pageX: 100 });

            expect(stubs.setValue).to.be.calledWith(1);
            expect(stubs.emit).to.be.calledWith('valuechange');
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
