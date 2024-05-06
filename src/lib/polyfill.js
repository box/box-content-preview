/* eslint-disable */
// PerformanceObserver no-op polyfill for IE11 and Edge (not supported)
if (!window.PerformanceObserver) {
    window.PerformanceObserver = function PerformanceObserverNoop() {
        return {
            disconnect: () => {},
            observe: () => {},
        };
    };
}
/* eslint-enable */
