/* eslint-disable no-unused-expressions */
import ProgressBar from '../progress-bar';

let mountEl;
let progressBar;
const sandbox = sinon.sandbox.create();

describe('progress-bar', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('__tests__/progress-bar-test.html');
        mountEl = document.querySelector('.mount');
        progressBar = new ProgressBar(mountEl);
    });

    afterEach(() => {
        fixture.cleanup();
        sandbox.verifyAndRestore();

        if (progressBar && typeof progressBar.destroy() === 'function') {
            progressBar.destroy();
        }

        progressBar = null;
    });

    describe('ProgressBar()', () => {
        it('should set up progress bar structure and initialize progress at 0', () => {
            expect(mountEl.querySelector('.bp-progress-bar-container')).to.equal(progressBar.containerEl);
            expect(progressBar.progressBarEl.classList.contains('bp-progress-bar')).to.be.true;
            expect(progressBar.progressBarEl.style.width).to.equal('0%');
        });
    });

    describe('destroy()', () => {
        it('should clear progress interval and unmount the progress bar', () => {
            sandbox.stub(window, 'clearInterval');

            progressBar.destroy();

            expect(window.clearInterval).to.be.calledWith(progressBar.progressInterval);
            expect(mountEl.querySelector('.bp-progress-bar-container')).to.equal(null);
        });
    });

    describe('start()', () => {
        let clock;

        beforeEach(() => {
            clock = sinon.useFakeTimers();
        });

        afterEach(() => {
            clock.restore();
        });

        it('should show the progress bar and initialize at random, low percentage', () => {
            sandbox.stub(progressBar, 'showProgress');
            sandbox.stub(progressBar, 'updateProgress');
            sandbox.stub(window, 'setInterval');

            progressBar.start();

            expect(progressBar.showProgress).to.be.called;
            expect(progressBar.updateProgress).to.be.calledWith(sinon.match.number);
        });

        it('should set an interval to update progress', () => {
            sandbox.stub(progressBar, 'showProgress');
            sandbox.stub(progressBar, 'updateProgress');

            progressBar.start();

            const currentProgress = progressBar.progress;
            clock.tick(101);
            expect(progressBar.progress).to.not.equal(currentProgress);
            expect(progressBar.updateProgress).to.be.calledTwice;
        });

        it('should clear the interval when progress is >= 90', () => {
            sandbox.stub(progressBar, 'showProgress');
            sandbox.stub(progressBar, 'updateProgress');
            sandbox.stub(window, 'clearInterval');

            progressBar.start();
            progressBar.progress = 90;

            // Simulate one interval after we reach the limit
            clock.tick(101);
            expect(window.clearInterval).to.be.calledWith(progressBar.progressInterval);
        });
    });

    describe('finish()', () => {
        let clock;

        beforeEach(() => {
            clock = sinon.useFakeTimers();
        });

        afterEach(() => {
            clock.restore();
        });

        it('should hide the progress bar, clear the interval, and update progress to 100', () => {
            sandbox.stub(progressBar, 'hideProgress');
            sandbox.stub(progressBar, 'updateProgress');
            sandbox.stub(window, 'clearInterval');

            progressBar.finish();

            expect(progressBar.hideProgress).to.be.called;
            expect(window.clearInterval).to.be.calledWith(progressBar.progressInterval);
            expect(progressBar.updateProgress).to.be.calledWith(100);
        });

        it('should set reset progress to 0 after a delay', () => {
            sandbox.stub(progressBar, 'hideProgress');
            sandbox.stub(progressBar, 'updateProgress');
            sandbox.stub(window, 'clearInterval');

            progressBar.finish();

            clock.tick(501);
            expect(progressBar.updateProgress).to.be.calledWith(0);
        });
    });

    describe('updateProgress()', () => {
        it('should update the progress bar element\'s width', () => {
            progressBar.updateProgress(57);
            expect(progressBar.progressBarEl.style.width).to.equal('57%');
        });
    });

    describe('showProgress()', () => {
        it('should show the progress bar', () => {
            progressBar.showProgress();
            expect(progressBar.progressBarEl.classList.contains('bp-is-visible')).to.be.true;
        });
    });

    describe('hideProgress()', () => {
        it('should hide the progress bar', () => {
            progressBar.showProgress();
            progressBar.hideProgress();
            expect(progressBar.progressBarEl.classList.contains('bp-is-visible')).to.be.false;
        });
    });
});
