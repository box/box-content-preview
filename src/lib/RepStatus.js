import EventEmitter from 'events';
import { appendAuthParamsV2, getHeaders } from './util';
import { STATUS_SUCCESS, STATUS_VIEWABLE, STATUS_PENDING, STATUS_NONE } from './constants';
import PreviewError from './PreviewError';
import Timer from './Timer';
import { ERROR_CODE, LOAD_METRIC } from './events';

const STATUS_UPDATE_INTERVAL_MS = 2000;

class RepStatus extends EventEmitter {
    /** @property {Api} - Api used for XHR calls */
    api;

    /**
     * Gets the status out of represenation
     *
     * @public
     * @param {Object} representation - representation object
     * @return {string} rep status state
     */
    static getStatus(representation) {
        let { status } = representation;
        status = typeof status === 'object' ? status.state : representation.temp_status.state;
        return status;
    }

    /**
     * Gets the error code out of the representation
     *
     * @public
     * @param {Object} representation - representation object
     * @return {string} rep error code
     */
    static getErrorCode(representation) {
        const { status } = representation;
        const code = typeof status === 'object' ? status.code : representation.temp_status.code;
        return code;
    }

    /**
     * Reads the status state out of a representation info response, tolerating a malformed payload
     *
     * @private
     * @param {Object} info - representation info response
     * @return {string|undefined} status state, or undefined when the payload has none
     */
    static getStateFromInfo(info) {
        if (!info) {
            return undefined;
        }

        if (typeof info.status === 'object') {
            return info.status ? info.status.state : undefined;
        }

        return info.temp_status ? info.temp_status.state : undefined;
    }

    /**
     * [constructor]
     *
     * @param {Object} options - Options object for representation status
     * @param {Api} [options.api] - Optional Api layer for http calls
     * @param {Object} options.representation - Representation object
     * @param {string} options.token - Access token
     * @param {string} options.sharedLink - Shared link
     * @param {string} options.sharedLinkPassword - Shared link password
     * @param {string} options.fileId - File ID
     * @param {Object} [options.logger] - Optional logger instance
     * @param {boolean} [options.enableConvertTimer] - Whether to time the conversion for the load metrics
     * @param {Object} [options.backoff] - Multiplies the pending poll interval by factor (default 2) up to
     * maxIntervalMs and rejects once polling would run past maxWaitMs. Polls every STATUS_UPDATE_INTERVAL_MS
     * indefinitely without it.
     * @return {RepStatus} RepStatus instance
     */
    constructor({
        api,
        representation,
        token,
        sharedLink,
        sharedLinkPassword,
        logger,
        fileId,
        enableConvertTimer = true,
        backoff = null,
    }) {
        super();

        this.api = api;
        this.representation = representation;
        this.logger = logger;
        this.fileId = fileId;
        this.enableConvertTimer = enableConvertTimer;
        this.backoff = backoff;
        this.pollIntervalMs = STATUS_UPDATE_INTERVAL_MS;

        // Some representations (e.g. ORIGINAL) may not have an info url
        const repInfo = this.representation.info;
        this.infoUrl = repInfo ? appendAuthParamsV2(repInfo.url, sharedLink, sharedLinkPassword) : '';
        this.headers = getHeaders({}, token);

        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }

    /**
     * [destructor]
     *
     * @return {void}
     */
    destroy() {
        this.destroyed = true;
        clearTimeout(this.statusTimeout);
    }

    /**
     * Fetches status of a representation asset
     *
     * @private
     * @return {Promise} Promise to update status
     */
    updateStatus() {
        if (!this.infoUrl || this.destroyed) {
            return Promise.resolve();
        }

        if (this.enableConvertTimer) {
            Timer.start(Timer.createTag(this.fileId, LOAD_METRIC.convertTime));
        }

        const options = this.headers ? { headers: this.headers } : {};
        return this.api.get(this.infoUrl, options).then(
            info => {
                if (this.destroyed) {
                    return;
                }

                clearTimeout(this.statusTimeout);

                const state = RepStatus.getStateFromInfo(info);
                if (!state) {
                    this.reject(
                        new PreviewError(ERROR_CODE.CONVERSION_GENERIC, __('error_refresh'), {
                            representation: this.representation,
                        }),
                    );
                    return;
                }

                if (info.metadata) {
                    this.representation.metadata = info.metadata;
                }

                if (typeof this.representation.status === 'object') {
                    this.representation.status.state = state;
                } else {
                    this.representation.temp_status.state = state;
                }

                this.handleResponse();
            },
            // Reject instead of hanging if the info request itself fails (e.g. the representation
            // endpoint returns a 4xx/5xx), so the viewer can surface an error rather than spin forever.
            () => {
                if (this.destroyed) {
                    return;
                }

                clearTimeout(this.statusTimeout);
                const error = new PreviewError(ERROR_CODE.CONVERSION_GENERIC, __('error_refresh'), {
                    representation: this.representation,
                });
                this.reject(error);
            },
        );
    }

    /**
     * Gets the status of a representation asset
     *
     * @private
     * @return {void}
     */
    handleResponse() {
        const status = RepStatus.getStatus(this.representation);
        const convertTag = Timer.createTag(this.fileId, LOAD_METRIC.convertTime);
        const code = RepStatus.getErrorCode(this.representation);
        let errorMessage;
        let error;

        switch (status) {
            case 'error':
                switch (code) {
                    case ERROR_CODE.CONVERSION_PASSWORD_PROTECTED:
                        errorMessage = __('error_password_protected');
                        break;
                    case ERROR_CODE.CONVERSION_TRY_AGAIN_LATER:
                        errorMessage = __('error_try_again_later');
                        break;
                    case ERROR_CODE.CONVERSION_UNSUPPORTED_FORMAT:
                        errorMessage = __('error_bad_file');
                        break;
                    case ERROR_CODE.CONVERSION_LARGE_SIZE_FILE:
                        errorMessage = __('error_large_file');
                        break;
                    case ERROR_CODE.CONVERSION_ZERO_BYTE_FILE:
                        errorMessage = __('error_zero_byte_file');
                        break;
                    case ERROR_CODE.CONVERSION_FAILED:
                        errorMessage = __('error_reupload');
                        break;
                    default:
                        errorMessage = __('error_refresh');
                        break;
                }

                error = new PreviewError(code, errorMessage, { representation: this.representation });
                this.reject(error);
                break;

            case STATUS_SUCCESS:
            case STATUS_VIEWABLE:
                if (this.enableConvertTimer) {
                    Timer.stop(convertTag);
                }
                this.resolve();
                break;

            case STATUS_NONE:
            case STATUS_PENDING:
                // If we are doing some logging, log that the file needed conversion
                if (this.logger) {
                    this.logger.setUnConverted();
                }

                this.emit('conversionpending');

                this.scheduleNextPoll(status);
                break;

            default:
            // no-op
        }
    }

    /**
     * Schedules the next status check. A 'none' status is checked immediately, since the conversion won't
     * kick off until the representation is requested.
     *
     * @private
     * @param {string} status - Current representation status
     * @return {void}
     */
    scheduleNextPoll(status) {
        const delay = status === STATUS_NONE ? 0 : this.pollIntervalMs;

        if (this.backoff) {
            const { factor = 2, maxIntervalMs, maxWaitMs } = this.backoff;

            this.pollStartTime = this.pollStartTime ?? Date.now();
            if (Date.now() - this.pollStartTime + delay > maxWaitMs) {
                this.reject(
                    new PreviewError(ERROR_CODE.CONVERSION_TRY_AGAIN_LATER, __('error_try_again_later'), {
                        representation: this.representation,
                    }),
                );
                return;
            }

            if (status !== STATUS_NONE) {
                this.pollIntervalMs = Math.min(Math.round(delay * factor), maxIntervalMs);
            }
        }

        this.statusTimeout = setTimeout(() => {
            this.updateStatus();
        }, delay);
    }

    /**
     * Promises to return the status of a representation asset
     *
     * @public
     * @return {Promise} Promise to detect represenation status
     */
    getPromise() {
        this.handleResponse();
        return this.promise;
    }
}

export default RepStatus;
