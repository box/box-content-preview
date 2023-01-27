import Api from '../api';
import PageTracker, { IDLE_TIMER, REPORTING_INTERVAL, REPORT_TRESHOLD } from '../PageTracker';

const stubs = {};
let pageTracker;

describe('lib/PageTracker', () => {
    beforeEach(() => {
        fixture.load('__tests__/PageTracker-test.html');
        stubs.api = new Api();
        stubs.contentInsights = {
            userEId: '123',
            ownerEId: '1234',
            userId: '12345',
            isActive: true,
        };
        stubs.file = {
            id: '1234',
            file_version: {
                id: '12345',
            },
        };
    });

    afterEach(() => {
        pageTracker = null;
    });

    describe('constructor()', () => {
        test('should initialize variables', () => {
            pageTracker = new PageTracker(stubs.contentInsights, stubs.file);
            expect(pageTracker.userEId).toBe(stubs.contentInsights.userEId);
            expect(pageTracker.ownerEId).toBe(stubs.contentInsights.ownerEId);
            expect(pageTracker.userId).toBe(stubs.contentInsights.userId);
            expect(pageTracker.file).toBe(stubs.file);
        });
    });

    describe('destroy()', () => {
        test('should invoke the clear functions', () => {
            pageTracker = new PageTracker();
            stubs.stopTracking = jest.spyOn(pageTracker, 'stopTracking');
            stubs.clearIdleTimeout = jest.spyOn(pageTracker, 'clearIdleTimeout');
            stubs.unbindIdleUserEvents = jest.spyOn(pageTracker, 'unbindIdleUserEvents');
            pageTracker.destroy();
            expect(stubs.stopTracking).toBeCalled();
            expect(stubs.clearIdleTimeout).toBeCalled();
            expect(stubs.unbindIdleUserEvents).toBeCalled();
        });

        test('should reset the variables', () => {
            pageTracker = new PageTracker();
            pageTracker.destroy();
            expect(pageTracker.sessionId).toBeNull();
            expect(pageTracker.startTime).toBeNull();
            expect(pageTracker.currentPage).toBeNull();
            expect(pageTracker.file).toEqual({});
        });
    });

    describe('getSessionId()', () => {
        test('should get the sessionId', () => {
            pageTracker = new PageTracker();
            pageTracker.sessionId = '1234';
            expect(pageTracker.getSessionId()).toBe(pageTracker.sessionId);
        });
    });

    describe('init()', () => {
        beforeEach(() => {
            pageTracker = new PageTracker(stubs.contentInsights, null);
            stubs.startTracking = jest.spyOn(pageTracker, 'startTracking');
            stubs.setIdleTimer = jest.spyOn(pageTracker, 'setIdleTimer');
        });

        test('should generate the sessionId', () => {
            pageTracker.init();
            expect(pageTracker.sessionId).toEqual(expect.any(String));
        });

        test('should call the start tracking functions', () => {
            pageTracker.init();
            expect(pageTracker.startTracking).toBeCalled();
            expect(pageTracker.setIdleTimer).toBeCalled();
        });

        test('should bind the Preview DOM container events', () => {
            stubs.bindIdleUserEvents = jest.spyOn(pageTracker, 'bindIdleUserEvents');
            pageTracker.init();
            expect(stubs.bindIdleUserEvents).toBeCalledTimes(1);
        });

        test('should not bind the Preview DOM container events multiple times', () => {
            stubs.bindIdleUserEvents = jest.spyOn(pageTracker, 'bindIdleUserEvents');
            pageTracker.init();
            pageTracker.init();
            expect(stubs.bindIdleUserEvents).toBeCalledTimes(1);
        });
    });

    describe('isActive()', () => {
        test('should get the content insights active status', () => {
            pageTracker = new PageTracker(stubs.contentInsights);
            expect(pageTracker.isActive()).toBe(stubs.contentInsights.isActive);
        });
    });

    describe('startTracking()', () => {
        beforeEach(() => {
            pageTracker = new PageTracker(stubs.contentInsights);
            stubs.report = jest.spyOn(pageTracker, 'report');
            stubs.stopTracking = jest.spyOn(pageTracker, 'stopTracking');
            jest.useFakeTimers();
        });

        test('should create a new Interval and set the startTime', () => {
            pageTracker.startTracking();
            expect(stubs.stopTracking).toBeCalled();
            expect(stubs.report).not.toBeCalled();
            expect(pageTracker.startTime).not.toBeNull();
            expect(pageTracker.reportingIntervalId).not.toBeNull();
        });

        test('should call the report content insights function when time passes', () => {
            pageTracker.startTracking();
            jest.advanceTimersByTime(REPORTING_INTERVAL - 1);
            expect(stubs.report).not.toBeCalled();
            jest.advanceTimersByTime(REPORTING_INTERVAL + 1);
            expect(stubs.report).toBeCalledTimes(2);
        });
    });

    describe('stopTracking()', () => {
        beforeEach(() => {
            pageTracker = new PageTracker(stubs.contentInsights);
            stubs.report = jest.spyOn(pageTracker, 'report');
            jest.useFakeTimers();
        });

        test('should clear the interval and call the report function once', () => {
            pageTracker.startTracking();
            expect(pageTracker.reportingIntervalId).not.toBeNull();
            pageTracker.stopTracking();
            expect(pageTracker.reportingIntervalId).toBeNull();
            jest.advanceTimersByTime(REPORTING_INTERVAL + 1);
            expect(stubs.report).toBeCalledTimes(1);
        });

        test('should not call the report function if the interval has not started', () => {
            pageTracker.stopTracking();
            expect(pageTracker.reportingIntervalId).toBeUndefined();
            jest.advanceTimersByTime(REPORTING_INTERVAL + 1);
            expect(stubs.report).not.toBeCalled();
        });
    });

    describe('handleViewerPageChange()', () => {
        beforeEach(() => {
            stubs.newPage = 2;
        });

        test('should call the report function', () => {
            pageTracker = new PageTracker(stubs.contentInsights);
            stubs.report = jest.spyOn(pageTracker, 'report');
            pageTracker.init();
            pageTracker.handleViewerPageChange(stubs.newPage);
            expect(stubs.report).toBeCalled();
        });

        test('should set a new interval', () => {
            pageTracker = new PageTracker(stubs.contentInsights);
            pageTracker.init();
            const prevIntervalId = pageTracker.reportingIntervalId;
            pageTracker.handleViewerPageChange(stubs.newPage);
            expect(pageTracker.reportingIntervalId).not.toBe(prevIntervalId);
        });

        test('should set the new page', () => {
            pageTracker = new PageTracker(stubs.contentInsights);
            pageTracker.init();
            pageTracker.handleViewerPageChange(stubs.newPage);
            expect(pageTracker.currentPage).toBe(stubs.newPage);
        });

        test('should not call the report function if not active', () => {
            pageTracker = new PageTracker({});
            stubs.report = jest.spyOn(pageTracker, 'report');
            pageTracker.init();
            pageTracker.handleViewerPageChange(stubs.newPage);
            expect(stubs.report).not.toBeCalled();
        });
    });

    describe('setIdleTimer()', () => {
        beforeEach(() => {
            pageTracker = new PageTracker(stubs.contentInsights);
            stubs.handleUserInactive = jest.spyOn(pageTracker, 'handleUserInactive');
        });

        test('should set a new timeout', () => {
            pageTracker.setIdleTimer();
            expect(pageTracker.idleTimerTimeoutId).not.toBeUndefined();
            expect(stubs.handleUserInactive).not.toBeCalled();
        });

        test('should call the callback function after time passes', () => {
            jest.useFakeTimers();
            pageTracker.setIdleTimer();
            jest.advanceTimersByTime(IDLE_TIMER + 1);
            expect(stubs.handleUserInactive).toBeCalled();
        });
    });

    describe('clearIdleTimeout()', () => {
        test('should clear the timeout and not call the callback function', () => {
            pageTracker = new PageTracker(stubs.contentInsights);
            stubs.handleUserInactive = jest.spyOn(pageTracker, 'handleUserInactive');
            jest.useFakeTimers();
            pageTracker.setIdleTimer();
            pageTracker.clearIdleTimeout();
            expect(pageTracker.idleTimerTimeoutId).toBeNull();
            jest.advanceTimersByTime(IDLE_TIMER + 1);
            expect(stubs.handleUserInactive).not.toBeCalled();
        });
    });

    describe('resetIdleTimer()', () => {
        beforeEach(() => {
            pageTracker = new PageTracker(stubs.contentInsights);
            stubs.startTracking = jest.spyOn(pageTracker, 'startTracking');
            stubs.clearIdleTimeout = jest.spyOn(pageTracker, 'clearIdleTimeout');
            stubs.setIdleTimer = jest.spyOn(pageTracker, 'setIdleTimer');
            pageTracker.init(stubs.contentInsights);
        });

        test('should call the clear timeout function', () => {
            pageTracker.resetIdleTimer();
            expect(stubs.clearIdleTimeout).toBeCalled();
            expect(stubs.setIdleTimer).toBeCalled();
            expect(pageTracker.idleTimerTimeoutId).not.toBeNull();
        });

        test('should change the timeout id when calling the reset function', () => {
            const prevTimeout = pageTracker.idleTimerTimeoutId;
            pageTracker.resetIdleTimer();
            expect(pageTracker.idleTimerTimeoutId).not.toBe(prevTimeout);
        });
    });

    describe('handleUserActive()', () => {
        test('should call resetIdleTimer', () => {
            pageTracker = new PageTracker(stubs.contentInsights);
            stubs.resetIdleTimer = jest.spyOn(pageTracker, 'resetIdleTimer');
            pageTracker.handleUserActive();
            expect(stubs.resetIdleTimer).toBeCalled();
        });
    });

    describe('handleUserInactive()', () => {
        test('should call the stop tracking function', () => {
            pageTracker = new PageTracker(stubs.contentInsights);
            stubs.stopTracking = jest.spyOn(pageTracker, 'stopTracking');
            pageTracker.handleUserInactive();
            expect(stubs.stopTracking).toBeCalled();
        });
    });

    describe('bindIdleUserEvents()', () => {
        beforeEach(() => {
            pageTracker = new PageTracker(stubs.contentInsights, null);
            stubs.addEventListener = jest.spyOn(window, 'addEventListener');
            stubs.handleUserActive = jest.spyOn(pageTracker, 'throttledActiveUserHandler');
            stubs.handleUserInactive = jest.spyOn(pageTracker, 'handleUserInactive');
            stubs.handleVisibilityChange = jest.spyOn(pageTracker, 'handleVisibilityChange');
            pageTracker.bindIdleUserEvents();
        });

        test.each([
            ['blur', false],
            ['click', true],
            ['focus', true],
            ['keydown', true],
            ['mousemove', true],
            ['touchstart', true],
            ['touchmove', true],
            ['wheel', true],
        ])('should add %s event listener', (listener, activeHandler) => {
            const callback = activeHandler ? stubs.handleUserActive : stubs.handleUserInactive;
            expect(stubs.addEventListener).toBeCalledWith(listener, callback);

            // Test the listeners
            window.dispatchEvent(new Event(listener));
            expect(callback).toBeCalled();
        });

        test('should add visibilitychange listener', () => {
            expect(stubs.addEventListener).toBeCalledWith('visibilitychange', stubs.handleVisibilityChange);

            // Test the listeners
            window.dispatchEvent(new Event('visibilitychange'));
            expect(stubs.handleVisibilityChange).toBeCalled();
        });

        test.each(['click', 'focus', 'keydown', 'mousemove', 'touchstart', 'touchmove', 'wheel'])(
            'should not call the inactive user timeout if the %s event triggers before',
            listener => {
                jest.useFakeTimers();
                pageTracker.init();
                // Advance time just before the timeout call
                jest.advanceTimersByTime(IDLE_TIMER - 1);
                window.dispatchEvent(new Event(listener));
                // Advance the timer again
                jest.advanceTimersByTime(IDLE_TIMER - 1);
                expect(stubs.handleUserInactive).not.toBeCalled();
            },
        );
    });

    describe('unbindIdleUserEvents()', () => {
        beforeEach(() => {
            pageTracker = new PageTracker(stubs.contentInsights, null);
            stubs.removeEventListener = jest.spyOn(window, 'removeEventListener');
            stubs.handleUserActive = jest.spyOn(pageTracker, 'throttledActiveUserHandler');
            stubs.handleUserInactive = jest.spyOn(pageTracker, 'handleUserInactive');
            stubs.handleVisibilityChange = jest.spyOn(pageTracker, 'handleVisibilityChange');
            pageTracker.init();
        });

        test.each([
            ['blur', false],
            ['click', true],
            ['focus', true],
            ['keydown', true],
            ['mousemove', true],
            ['touchstart', true],
            ['touchmove', true],
            ['wheel', true],
        ])('should remove %s event listener', (listener, activeHandler) => {
            pageTracker.unbindIdleUserEvents();
            const callback = activeHandler ? stubs.handleUserActive : stubs.handleUserInactive;
            expect(stubs.removeEventListener).toBeCalledWith(listener, callback);

            // Test the listeners
            window.dispatchEvent(new Event(listener));
            expect(callback).not.toBeCalled();
        });

        test('should remove visibilitychange listener', () => {
            pageTracker.unbindIdleUserEvents();
            expect(stubs.removeEventListener).toBeCalledWith('visibilitychange', stubs.handleVisibilityChange);

            // Test the listeners
            window.dispatchEvent(new Event('visibilitychange'));
            expect(stubs.handleVisibilityChange).not.toBeCalled();
        });

        test.each(['click', 'focus', 'keydown', 'mousemove', 'touchstart', 'touchmove', 'wheel'])(
            'should not reset the idle timeout if the %s event triggers before',
            listener => {
                jest.useFakeTimers();
                pageTracker.init();
                pageTracker.unbindIdleUserEvents();
                // Advance time just before the timeout call
                jest.advanceTimersByTime(IDLE_TIMER - 1);
                window.dispatchEvent(new Event(listener));
                // Advance the timer again
                jest.advanceTimersByTime(IDLE_TIMER - 1);
                expect(stubs.handleUserActive).not.toBeCalled();
            },
        );
    });

    describe('report()', () => {
        beforeEach(() => {
            pageTracker = new PageTracker(stubs.contentInsights, stubs.file);
            stubs.promiseResolve = Promise.resolve({});
            pageTracker.startTime = Date.now();
            jest.useFakeTimers('modern');
            stubs.date = new Date();
            jest.spyOn(Api.prototype, 'post').mockReturnValue(stubs.promiseResolve);
            stubs.report = jest.spyOn(pageTracker, 'report');
            stubs.emitReportEvent = jest.spyOn(pageTracker, 'emit');
        });

        test('should not make the API call if the time is less than the treshold', () => {
            pageTracker.setPreviewEventReported(true);
            jest.setSystemTime(stubs.date.setSeconds(stubs.date.getSeconds() + (REPORT_TRESHOLD - 1) / 1000));
            pageTracker.report();
            expect(stubs.emitReportEvent).not.toBeCalled();
        });

        test('should make the API call if the time is higher than the treshold', () => {
            pageTracker.setPreviewEventReported(true);
            jest.setSystemTime(stubs.date.setSeconds(stubs.date.getSeconds() + REPORT_TRESHOLD / 1000 + 1));
            pageTracker.report();
            expect(stubs.emitReportEvent).toBeCalled();
        });

        test('should not make the API call if the preview event is not reported yet', () => {
            jest.setSystemTime(stubs.date.setSeconds(stubs.date.getSeconds() + REPORT_TRESHOLD / 1000 + 1));
            pageTracker.report();
            expect(stubs.emitReportEvent).not.toBeCalled();
        });

        test('should batch previous report calls if the preview event was fired before the first ACI report', () => {
            jest.setSystemTime(stubs.date.setSeconds(stubs.date.getSeconds() + REPORT_TRESHOLD / 1000 + 1));
            pageTracker.report();
            expect(stubs.emitReportEvent).not.toBeCalled();
            jest.advanceTimersByTime(REPORTING_INTERVAL - 1);
            pageTracker.setPreviewEventReported(true);
            pageTracker.report();
            const payload = {
                events: [
                    {
                        payload: expect.any(Object),
                        target: expect.any(Object),
                        timestamp: expect.any(Number),
                        userId: Number(stubs.contentInsights.userId),
                    },
                    {
                        payload: expect.any(Object),
                        target: expect.any(Object),
                        timestamp: expect.any(Number),
                        userId: Number(stubs.contentInsights.userId),
                    },
                ],
                type: 'pageView',
            };
            expect(stubs.emitReportEvent).toBeCalledWith('page_tracker_report', expect.objectContaining(payload));
        });

        test('should make the API call with the correct payload', () => {
            pageTracker.setPreviewEventReported(true);
            stubs.page = {
                currentPage: 1,
                numPages: 10,
            };

            pageTracker.init();
            pageTracker.setCurrentPage(stubs.page.currentPage);
            pageTracker.setFileLength(stubs.page.numPages);
            jest.advanceTimersByTime(REPORTING_INTERVAL + 1);
            jest.setSystemTime(stubs.date.setSeconds(stubs.date.getSeconds() + REPORTING_INTERVAL / 1000));
            const payload = {
                events: [
                    {
                        payload: {
                            page: {
                                number: stubs.page.currentPage,
                                viewMs: expect.any(Number),
                            },
                            sessionId: expect.any(String),
                        },
                        target: {
                            id: Number(stubs.file.id),
                            length: stubs.page.numPages,
                            ownerEId: stubs.contentInsights.ownerEId,
                            type: 'file',
                            versionId: Number(stubs.file.file_version.id),
                        },
                        timestamp: expect.any(Number),
                        userId: Number(stubs.contentInsights.userId),
                    },
                ],
                type: 'pageView',
            };
            expect(stubs.report).toBeCalledTimes(1);
            expect(stubs.emitReportEvent).toBeCalledWith('page_tracker_report', expect.objectContaining(payload));
        });
    });

    describe('setCurrentPage()', () => {
        test('should set the current page', () => {
            pageTracker = new PageTracker(stubs.contentInsights);
            pageTracker.setCurrentPage(1);
            expect(pageTracker.currentPage).toBe(1);
        });
    });

    describe('setFileLength()', () => {
        test('should set the file length', () => {
            pageTracker = new PageTracker(stubs.contentInsights);
            pageTracker.setFileLength(10);
            expect(pageTracker.fileLength).toBe(10);
        });
    });

    describe('setOptions()', () => {
        test('should set the options properties', () => {
            pageTracker = new PageTracker(stubs.contentInsights);
            stubs.updatedOptions = {
                userEId: '356',
                ownerEId: '5678',
                userId: '5678',
                isActive: false,
            };
            pageTracker.setOptions(stubs.updatedOptions);
            expect(pageTracker.isAdvancedInsightsActive).toBe(stubs.updatedOptions.isActive);
            expect(pageTracker.ownerEId).toBe(stubs.updatedOptions.ownerEId);
            expect(pageTracker.userEId).toBe(stubs.updatedOptions.userEId);
            expect(pageTracker.userId).toBe(stubs.updatedOptions.userId);
        });
    });

    describe('updateOptions()', () => {
        test('should call the set options method', () => {
            pageTracker = new PageTracker(stubs.contentInsights);
            stubs.setOptions = jest.spyOn(pageTracker, 'setOptions');
            pageTracker.updateOptions(stubs.contentInsights);
            expect(stubs.setOptions).toBeCalled();
        });

        test('should  call the stop tracking method if isActive is set to false', () => {
            pageTracker = new PageTracker(stubs.contentInsights);
            stubs.init = jest.spyOn(pageTracker, 'init');
            stubs.stopTracking = jest.spyOn(pageTracker, 'stopTracking');
            pageTracker.updateOptions({ isActive: false });
            expect(stubs.init).not.toBeCalled();
            expect(stubs.stopTracking).toBeCalled();
        });

        test('should  call the init tracking method if isActive is set to true', () => {
            pageTracker = new PageTracker({ isActive: false });
            stubs.init = jest.spyOn(pageTracker, 'init');
            stubs.startTracking = jest.spyOn(pageTracker, 'startTracking');
            pageTracker.updateOptions(stubs.contentInsights);
            expect(stubs.init).toBeCalled();
            expect(pageTracker.sessionId).not.toBeNull();
            expect(stubs.startTracking).toBeCalled();
        });
    });

    describe('handleVisibilityChange()', () => {
        beforeEach(() => {
            pageTracker = new PageTracker(stubs.contentInsights, stubs.file);
            stubs.handleUserActive = jest.spyOn(pageTracker, 'handleUserActive');
            stubs.handleUserInactive = jest.spyOn(pageTracker, 'handleUserInactive');
        });

        test('should call the handleUserActive on visibilitychange = visible', () => {
            pageTracker.handleVisibilityChange({
                target: {
                    visibilityState: 'visible',
                },
            });
            expect(stubs.handleUserActive).toBeCalled();
            expect(stubs.handleUserInactive).not.toBeCalled();
        });

        test('should call the handleUserInactive on visibilitychange = hidden', () => {
            pageTracker.handleVisibilityChange({
                target: {
                    visibilityState: 'hidden',
                },
            });
            expect(stubs.handleUserActive).not.toBeCalled();
            expect(stubs.handleUserInactive).toBeCalled();
        });
    });
});
