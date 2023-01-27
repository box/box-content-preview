import throttle from 'lodash/throttle';
import EventEmitter from 'events';
import { uuidv4 } from './logUtils';

export const REPORTING_INTERVAL = 5000; // number of milliseconds elapsed between each content insights reporting
export const REPORT_TRESHOLD = 1500;
export const IDLE_TIMER = 30000;
const ACTIVE_USER_THROTTLE = 500;

class PageTracker extends EventEmitter {
    /** @property {boolean} - Whether Advanced Content Insights is on for the file that we are tracking */
    isAdvancedInsightsActive = false;

    /** @property {number|null} - Current page number the document is at */
    currentPage;

    /** @property {Array} - Events to be reported */
    events = [];

    /** @property {Object} - Current file being previewed */
    file = {};

    /** @property {number} - File Length. On Document file types will be the number of pages. */
    fileLength;

    /** @property {number} -  Idle Timeout ID */
    idleTimerTimeoutId;

    /** @property {boolean} - Whether the Access Stats Preview Event was reported */
    previewEventReported = false;

    /** @property {string|null} - File Owner Enterprise ID. */
    ownerEId;

    /** @property {number} - Interval ID for reporting page data */
    reportingIntervalId;

    /** @property {string|null} - Random ID to identify a particular Session/Visit */
    sessionId;

    /** @property {Date|null} - Reference date from where the current report to be sent starts */
    startTime;

    /** @property {string|null} - User Enterprise ID */
    userEId;

    /** @property {boolean} - Whether the user events are binded or not */
    userEventsBounded = false;

    /** @property {number|null} - User ID */
    userId;

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * [constructor]
     * @param {Object} options - Content Insights Related Options
     * @param {Object} file - File that is being previewed
     * @return {PageTracker} PageTracker instance
     */
    constructor(options = {}, file) {
        super();
        // Generate a new session id. This would need to be later changed to be generated on server side
        this.sessionId = uuidv4();
        this.setOptions(options);
        this.file = file;
        this.handleUserActive = this.handleUserActive.bind(this);
        this.handleUserInactive = this.handleUserInactive.bind(this);
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
        this.throttledActiveUserHandler = throttle(this.handleUserActive, ACTIVE_USER_THROTTLE, { trailing: false });
    }

    /**
     * [destructor]
     *
     * @return {void}
     */
    destroy() {
        this.stopTracking();
        this.unbindIdleUserEvents();
        this.clearIdleTimeout();
        this.currentPage = null;
        this.file = {};
        this.sessionId = null;
        this.startTime = null;
    }

    /**
     * Get the session id
     *
     * @public
     * @return {string}
     */
    getSessionId() {
        return this.sessionId;
    }

    /**
     * Call the interval starting function and set the idle timer
     *
     * @public
     * @return {void}
     */
    init() {
        if (!this.userEventsBounded) {
            this.bindIdleUserEvents();
        }
        // Start tracking time on file if content insights is turn on for that particular file
        this.setIdleTimer();
        this.startTracking();
    }

    /**
     * Whether Advanced Content Insights is on/off
     *
     * @public
     * @return {boolean}
     */
    isActive() {
        return this.isAdvancedInsightsActive;
    }

    /**
     * Start the content insights interval, to report data each number of seconds defined on a Const
     *
     * @public
     * @return {void}
     */
    startTracking() {
        this.stopTracking();
        this.startTime = Date.now();

        this.reportingIntervalId = setInterval(() => {
            this.report();
        }, REPORTING_INTERVAL);
    }

    /**
     * Stop the content insights interval, for example, if a user goes idle or the user changes the page
     * and report the data
     *
     * @public
     * @return {void}
     */
    stopTracking() {
        if (!this.reportingIntervalId) return;

        clearInterval(this.reportingIntervalId);
        this.reportingIntervalId = null;
        this.report();
    }

    /**
     * Handle the page change event. At this moment, it would stop the current timer interval,
     * report the data for the previous page, and start the interval again
     *
     * @public
     * @param {number} pageNumber - The new page number
     * @return {void}
     */
    handleViewerPageChange(pageNumber) {
        if (this.isAdvancedInsightsActive) {
            this.stopTracking();
            this.setCurrentPage(pageNumber);
            this.startTracking();
        } else {
            this.setCurrentPage(pageNumber);
        }
    }

    /**
     * Set the idle timeout to call the handleUserInactive when time passes
     *
     * @private
     * @return {void}
     */
    setIdleTimer() {
        this.idleTimerTimeoutId = setTimeout(this.handleUserInactive, IDLE_TIMER);
    }

    /**
     * Clear the idle timeout
     *
     * @private
     * @return {void}
     */
    clearIdleTimeout() {
        clearTimeout(this.idleTimerTimeoutId);
        this.idleTimerTimeoutId = null;
    }

    /**
     * Reset the idle timeout to avoid calling the handleUserInactive if the user is active.
     * Also, if the content insights interval is stopped (because the user was inactive) restart the interval
     *
     * @private
     * @return {void}
     */
    resetIdleTimer() {
        if (!this.reportingIntervalId && this.isAdvancedInsightsActive) {
            this.startTracking();
        }
        this.clearIdleTimeout();
        this.setIdleTimer();
    }

    /**
     * Call the resetIdleTimer if the user is active
     *
     * @private
     * @return {void}
     */
    handleUserActive() {
        this.resetIdleTimer();
    }

    /**
     * Stops the content insights interval if the user goes inactive
     *
     * @private
     * @return {void}
     */
    handleUserInactive() {
        this.stopTracking();
    }

    /**
     * Check the visibility state of the window
     *
     * @private
     * @return {void}
     */
    handleVisibilityChange(event) {
        if (event.target.visibilityState === 'visible') {
            this.handleUserActive();
        } else {
            this.handleUserInactive();
        }
    }

    /**
     * Binds DOM listeners to the document to manage if the user goes active or inactive.
     *
     * @private
     * @return {void}
     */
    bindIdleUserEvents() {
        window.addEventListener('blur', this.handleUserInactive);
        window.addEventListener('click', this.throttledActiveUserHandler);
        window.addEventListener('focus', this.throttledActiveUserHandler);
        window.addEventListener('keydown', this.throttledActiveUserHandler);
        window.addEventListener('mousemove', this.throttledActiveUserHandler);
        window.addEventListener('touchmove', this.throttledActiveUserHandler);
        window.addEventListener('touchstart', this.throttledActiveUserHandler);
        window.addEventListener('wheel', this.throttledActiveUserHandler);
        window.addEventListener('visibilitychange', this.handleVisibilityChange);

        this.userEventsBounded = true;
    }

    /**
     * Unbinds DOM listeners from the document that manages if the user goes active or inactive.
     *
     * @private
     * @return {void}
     */
    unbindIdleUserEvents() {
        window.removeEventListener('blur', this.handleUserInactive);
        window.removeEventListener('click', this.throttledActiveUserHandler);
        window.removeEventListener('focus', this.throttledActiveUserHandler);
        window.removeEventListener('keydown', this.throttledActiveUserHandler);
        window.removeEventListener('mousemove', this.throttledActiveUserHandler);
        window.removeEventListener('touchmove', this.throttledActiveUserHandler);
        window.removeEventListener('touchstart', this.throttledActiveUserHandler);
        window.removeEventListener('wheel', this.throttledActiveUserHandler);
        window.removeEventListener('visibilitychange', this.handleVisibilityChange);

        this.userEventsBounded = false;
    }

    /**
     *  Construct and emit the report advanced content insight event
     *
     * @private
     * @return {void}
     */
    report() {
        const pageViewUTCTimestamp = Date.now();
        const timeToBeReported = pageViewUTCTimestamp - this.startTime;

        this.startTime = Date.now();
        // Report only time with a minimum threshold for this moment. This is to avoid a situation that the
        // user is just spamming the scroll event to change pages and not send a lot of requests.
        // Ideally, we can just batch that data and send it later...
        if (timeToBeReported < REPORT_TRESHOLD) return;
        const { id: fileId, file_version: { id: fileVersionId } = null } = this.file;
        // Add the current event to the events Array.
        this.events.push({
            userId: Number(this.userId),
            timestamp: pageViewUTCTimestamp,
            payload: {
                page: {
                    number: this.currentPage,
                    viewMs: timeToBeReported,
                },
                sessionId: this.sessionId,
            },
            target: {
                id: Number(fileId),
                length: this.fileLength,
                ownerEId: this.ownerEId,
                type: 'file',
                versionId: Number(fileVersionId),
            },
        });

        if (this.previewEventReported) {
            this.emit('page_tracker_report', { events: [...this.events], type: 'pageView' });
            // Clear the events array
            this.events.length = 0;
        }
    }

    /**
     * Sets the currently selected page
     *
     * @private
     *  @param {number} pageNumber - The page number to set to selected
     * @return {void}
     */
    setCurrentPage(pageNumber = 0) {
        this.currentPage = pageNumber;
    }

    /**
     *  Set file length data
     *
     * @private
     * @param {number} numPages - Number of pages inside the document
     * @return {void}
     */
    setFileLength(numPages = 0) {
        this.fileLength = numPages;
    }

    /**
     * Updates the flag that indicates if the Access Stats PREVIEW event was successfully reported.
     * If the request fails, we won't send additional insights because we don't want to have
     * data inconsistency
     *
     * @private
     * @param {boolean} reported
     * @return {void}
     */
    setPreviewEventReported(reported) {
        this.previewEventReported = reported;
    }

    /**
     *  Set content insights options
     *
     * @private
     * @param {Object} options - Content Insights options
     * @return {void}
     */
    setOptions({ ownerEId, userEId, userId, isActive = false }) {
        // Set User and file information
        this.ownerEId = ownerEId;
        this.userEId = userEId;
        this.userId = userId;
        this.isAdvancedInsightsActive = isActive;
    }

    /**
     *  Update content insights options
     *
     * @private
     * @param {Object} options - Content Insights options
     * @return {void}
     */
    updateOptions(options = {}) {
        // Set User and file information
        const prevActiveState = this.isAdvancedInsightsActive;
        this.setOptions(options);
        if (prevActiveState !== this.isAdvancedInsightsActive) {
            // If ACI was deactivated, stop tracking user events
            if (!this.isAdvancedInsightsActive) {
                this.stopTracking();
                this.unbindIdleUserEvents();
            } else {
                this.init();
            }
        }
    }
}

export default PageTracker;
