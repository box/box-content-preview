import PreviewPerf from '../PreviewPerf';

describe('lib/PreviewPerf', () => {
    const getPerfEntries = (entries = []) => {
        return {
            getEntries: () => entries,
            getEntriesByName: name => entries.filter(entry => entry.name === name),
            getEntriesByType: type => entries.filter(entry => entry.type === type),
        };
    };
    let previewPerf;

    beforeEach(() => {
        window.PerformanceObserver = jest.fn(() => ({
            disconnect: jest.fn(),
            observe: jest.fn(),
        }));

        previewPerf = new PreviewPerf();
    });

    afterEach(() => {
        if (previewPerf) {
            previewPerf.destroy();
            previewPerf = null;
        }
    });

    describe('constructor', () => {
        test('should create performance observers for applicable metrics', () => {
            expect(window.PerformanceObserver).toBeCalledWith(previewPerf.handleFcp);
            expect(window.PerformanceObserver).toBeCalledWith(previewPerf.handleLcp);
        });
    });

    describe('report', () => {
        test('should return the current performance report', () => {
            expect(previewPerf.report()).toBe(previewPerf.performanceReport);
        });
    });

    describe('handleFcp', () => {
        test('should update the performance report the first rounded FCP metric', () => {
            previewPerf.handleFcp(
                getPerfEntries([
                    {
                        name: 'first-contentful-paint',
                        startTime: 500.5,
                    },
                ]),
            );

            expect(previewPerf.report()).toEqual({ fcp: 501 });
        });

        test('should update the performance report with a zero value if the metric is not present', () => {
            previewPerf.handleFcp(
                getPerfEntries([
                    {
                        type: 'nonsense',
                        loadTime: 1000.0,
                    },
                ]),
            );

            expect(previewPerf.report()).toEqual({ fcp: 0 });
        });
    });

    describe('handleLcp', () => {
        test('should update the performance report with the last rounded LCP metric', () => {
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

            expect(previewPerf.report()).toEqual({ lcp: 3001 });
        });

        test('should update the performance report with a zero value if the metric is not present', () => {
            previewPerf.handleLcp(
                getPerfEntries([
                    {
                        type: 'nonsense',
                        responseEnd: 1000.0,
                    },
                ]),
            );

            expect(previewPerf.report()).toEqual({ lcp: 0 });
        });
    });
});
