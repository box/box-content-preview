interface PerformancePaintTiming {
    loadTime?: DOMHighResTimeStamp;
    renderTime?: DOMHighResTimeStamp;
}

interface PerformanceReport {
    fcp?: number;
    lcp?: number;
}

export default class PreviewPerf {
    private fcpObserver: PerformanceObserver;

    private lcpObserver: PerformanceObserver;

    private performanceReport: PerformanceReport = {};

    /**
     * Performance metrics are recorded in a global context. We use only unbuffered metrics to avoid skewed data,
     * as buffered values can be set based on whatever page the user *first* landed on, which may not be preview.
     *
     * Glossary:
     *  - FCP - First Contentful Paint (usually loading screen)
     *  - LCP - Largest Contentful Paint (usually full content preview)
     */
    constructor() {
        // Bind handlers to the current instance
        this.handleFcp = this.handleFcp.bind(this);
        this.handleLcp = this.handleLcp.bind(this);

        // Intialize the performance observers
        this.fcpObserver = new window.PerformanceObserver(this.handleFcp);
        this.lcpObserver = new window.PerformanceObserver(this.handleLcp);

        try {
            this.fcpObserver.observe({ entryTypes: ['paint'] });
            this.lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        } catch (e) {
            // We're unable to collect these metrics from legacy browsers, such as IE11/Edge (non-Chromium)
        }
    }

    /**
     * Disconnect active observers to avoid memory leaks
     */
    public destroy(): void {
        this.fcpObserver.disconnect();
        this.lcpObserver.disconnect();
    }

    /**
     * Returns defined metrics if the following conditions are satisfied:
     *  1) it's recorded by the browser at all (some are Chrome-only, for now)
     *  2) if it was logged *after* the Preview SDK was loaded (not buffered)
     */
    public report(): PerformanceReport {
        return this.performanceReport;
    }

    protected handleFcp(list: PerformanceObserverEntryList): void {
        const fcpEntries = list.getEntriesByName('first-contentful-paint') || [];
        const fcpEntry = fcpEntries[0] || {};

        this.performanceReport.fcp = Math.round(fcpEntry.startTime || 0);
    }

    protected handleLcp(list: PerformanceObserverEntryList): void {
        const lcpEntries = (list.getEntriesByType('largest-contentful-paint') as PerformancePaintTiming[]) || [];
        const lcpEntry = lcpEntries[lcpEntries.length - 1] || {};

        this.performanceReport.lcp = Math.round(lcpEntry.renderTime || lcpEntry.loadTime || 0);
    }
}
