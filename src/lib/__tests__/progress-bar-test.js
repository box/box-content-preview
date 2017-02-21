/* eslint-disable no-unused-expressions */
import ProgressBar from '../progress-bar';

let mountEl;
let progressBar;
const sandbox = sinon.sandbox.create();

describe('lib/progress-bar', () => {
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
        it('should set up progress bar structure', () => {
            expect(progressBar.containerEl).to.have.class('bp-progress-bar-container');
            expect(progressBar.progressBarEl).to.have.class('bp-progress-bar');
            expect(progressBar.containerEl).to.contain(progressBar.progressBarEl);
            expect(progressBar.mountEl).to.contain(progressBar.containerEl);
        });
    });

    describe('destroy()', () => {
        it('should clear progress interval and unmount the progress bar', () => {
            sandbox.mock(window).expects('clearInterval').withArgs(progressBar.progressInterval);
            progressBar.destroy();
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

        it('should show the progress bar and set progress to 0', () => {
            sandbox.mock(progressBar).expects('showProgress');
            sandbox.stub(window, 'setInterval');

            progressBar.start();
            expect(progressBar.progress).to.equal(0);
        });

        it('should set an interval to update progress', () => {
            sandbox.stub(progressBar, 'showProgress');
            progressBar.start();

            // Simulate one progress bar tick
            clock.tick(151);
            expect(progressBar.progress).to.not.equal(0);
        });

        it('should clear the interval when progress is >= 90', () => {
            sandbox.stub(progressBar, 'showProgress');
            sandbox.mock(window).expects('clearInterval').withArgs(sinon.match.number);

            progressBar.start();
            progressBar.progress = 90;

            // Simulate one progress bar tick after we reach the limit
            clock.tick(151);
        });
    });

    describe('finish()', () => {
        it('should hide the progress bar, clear the interval, and update progress to 100', () => {
            const mock = sandbox.mock(progressBar);
            mock.expects('hideProgress');
            mock.expects('updateProgress').withArgs(100);
            sandbox.mock(window).expects('clearInterval').withArgs(progressBar.progressInterval);
            progressBar.finish();
        });
    });

    describe('updateProgress()', () => {
        it('should update the progress bar element\'s width', () => {
            const progress = 57;
            progressBar.updateProgress(progress);
            expect(progressBar.progressBarEl.style.width).to.equal(`${progress}%`);
        });
    });

    describe('showProgress()', () => {
        it('should show the progress bar', () => {
            progressBar.showProgress();
            expect(progressBar.progressBarEl).to.have.class('bp-is-visible');
        });
    });

    describe('hideProgress()', () => {
        it('should hide the progress bar', () => {
            progressBar.progressBarEl.classList.add('bp-is-visible');
            progressBar.hideProgress();
            expect(progressBar.progressBarEl).to.not.have.class('bp-is-visible');
        });
    });
});
