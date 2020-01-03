import PreviewPerf from '../PreviewPerf';

describe('lib/PreviewPerf', () => {
    const getPerfEntries = (entries = []) => {
        return {
            getEntries: () => entries,
            getEntriesByName: name => entries.filter(entry => entry.name === name),
            getEntriesByType: type => entries.filter(entry => entry.type === type),
        };
    };
    const sandbox = sinon.sandbox.create();
    let previewPerf;

    beforeEach(() => {
        sandbox.stub(window, 'PerformanceObserver').returns({
            disconnect: sandbox.stub(),
            observe: sandbox.stub(),
        });

        previewPerf = new PreviewPerf();
    });

    afterEach(() => {
        sandbox.verifyAndRestore();

        if (previewPerf) {
            previewPerf.destroy();
            previewPerf = null;
        }
    });

    describe('constructor', () => {
        it('should create performance observers for applicable metrics', () => {
            expect(window.PerformanceObserver).to.be.calledWith(previewPerf.handleFcp);
            expect(window.PerformanceObserver).to.be.calledWith(previewPerf.handleLcp);
        });
    });

    describe('report', () => {
        it('should return the current performance report', () => {
            expect(previewPerf.report()).to.deep.equal(previewPerf.performanceReport);
        });
    });

    describe('handleFcp', () => {
        it('should update the performance report the first rounded FCP metric', () => {
            previewPerf.handleFcp(
                getPerfEntries([
                    {
                        name: 'first-contentful-paint',
                        startTime: 500.5,
                    },
                ]),
            );

            expect(previewPerf.report()).to.include({ fcp: 501 });
        });

        it('should update the performance report with a zero value if the metric is not present', () => {
            previewPerf.handleFcp(
                getPerfEntries([
                    {
                        type: 'nonsense',
                        loadTime: 1000.0,
                    },
                ]),
            );

            expect(previewPerf.report()).to.include({ fcp: 0 });
        });
    });

    describe('handleLcp', () => {
        it('should update the performance report with the last rounded LCP metric', () => {
            previewPerf.handleLcp(
                getPerfEntries([
                    {
                        type: 'largest-contentful-paint',
                        renderTime: 1000.5,
                    },
                    {
                        type: 'largest-contentful-paint',
                        renderTime: 2000.5,
                    },
                    {
                        type: 'largest-contentful-paint',
                        renderTime: 3000.5,
                    },
                ]),
            );

            expect(previewPerf.report()).to.include({ lcp: 3001 });
        });

        it('should update the performance report with a zero value if the metric is not present', () => {
            previewPerf.handleLcp(
                getPerfEntries([
                    {
                        type: 'nonsense',
                        responseEnd: 1000.0,
                    },
                ]),
            );

            expect(previewPerf.report()).to.include({ lcp: 0 });
        });
    });
});
