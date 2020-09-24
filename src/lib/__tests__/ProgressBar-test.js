/* eslint-disable no-unused-expressions */
import ProgressBar from '../ProgressBar';

const sandbox = sinon.createSandbox();
let mountEl;
let progressBar;

describe('lib/ProgressBar', () => {
    beforeEach(() => {
        fixture.load('__tests__/ProgressBar-test.html');
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
        test('should set up progress bar structure', () => {
            expect(progressBar.containerEl).toHaveClass('bp-progress-bar-container');
            expect(progressBar.progressBarEl).toHaveClass('bp-progress-bar');
            expect(progressBar.containerEl.children).toContain(progressBar.progressBarEl);
            expect(progressBar.mountEl.children).toContain(progressBar.containerEl);
        });
    });

    describe('destroy()', () => {
        test('should clear progress interval and unmount the progress bar', () => {
            sandbox
                .mock(window)
                .expects('clearInterval')
                .withArgs(progressBar.progressInterval);
            progressBar.destroy();
            expect(mountEl.querySelector('.bp-progress-bar-container')).toBeNull();
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

        test('should show the progress bar and set progress to 0', () => {
            sandbox.mock(progressBar).expects('showProgress');
            jest.spyOn(window, 'setInterval');

            progressBar.start();
            expect(progressBar.progress).toBe(0);
        });

        test('should set an interval to update progress', () => {
            jest.spyOn(progressBar, 'showProgress');
            progressBar.start();

            // Simulate one progress bar tick
            clock.tick(151);
            expect(progressBar.progress).not.toBe(0);
        });

        test('should clear the interval when progress is >= 95', () => {
            jest.spyOn(progressBar, 'showProgress');
            sandbox
                .mock(window)
                .expects('clearInterval')
                .withArgs(sinon.match.number);

            progressBar.start();
            progressBar.progress = 95;

            // Simulate one progress bar tick after we reach the limit
            clock.tick(151);
        });
    });

    describe('finish()', () => {
        test('should hide the progress bar, clear the interval, and update progress to 100', () => {
            const mock = sandbox.mock(progressBar);
            mock.expects('hideProgress');
            mock.expects('updateProgress').withArgs(100);
            sandbox
                .mock(window)
                .expects('clearInterval')
                .withArgs(progressBar.progressInterval);
            progressBar.finish();
        });
    });

    describe('updateProgress()', () => {
        test("should update the progress bar element's width", () => {
            const progress = 57;
            progressBar.updateProgress(progress);
            expect(progressBar.progressBarEl.style.width).toBe(`${progress}%`);
        });
    });

    describe('showProgress()', () => {
        test('should show the progress bar', () => {
            progressBar.showProgress();
            expect(progressBar.progressBarEl).toHaveClass('bp-is-visible');
        });
    });

    describe('hideProgress()', () => {
        test('should hide the progress bar', () => {
            progressBar.progressBarEl.classList.add('bp-is-visible');
            progressBar.hideProgress();
            expect(progressBar.progressBarEl).not.toHaveClass('bp-is-visible');
        });
    });
});
