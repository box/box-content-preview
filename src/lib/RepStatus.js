import EventEmitter from 'events';
import { appendAuthParams } from './util';
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
     * @return {RepStatus} RepStatus instance
     */
    constructor({ api, representation, token, sharedLink, sharedLinkPassword, logger, fileId }) {
        super();

        this.api = api;
        this.representation = representation;
        this.logger = logger;
        this.fileId = fileId;

        // Some representations (e.g. ORIGINAL) may not have an info url
        const repInfo = this.representation.info;
        this.infoUrl = repInfo ? appendAuthParams(repInfo.url, token, sharedLink, sharedLinkPassword) : '';

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
        clearTimeout(this.statusTimeout);
    }

    /**
     * Fetches status of a representation asset
     *
     * @private
     * @return {Promise} Promise to update status
     */
    updateStatus() {
        if (!this.infoUrl) {
            return Promise.resolve();
        }

        const tag = Timer.createTag(this.fileId, LOAD_METRIC.convertTime);
        Timer.start(tag);

        return this.api.get(this.infoUrl).then(info => {
            clearTimeout(this.statusTimeout);

            if (info.metadata) {
                this.representation.metadata = info.metadata;
            }

            const status = typeof info.status === 'object' ? info.status.state : info.temp_status.state;
            if (typeof this.representation.status === 'object') {
                this.representation.status.state = status;
            } else {
                this.representation.temp_status.state = status;
            }

            this.handleResponse();
        });
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
                Timer.stop(convertTag);
                this.resolve();
                break;

            case STATUS_NONE:
            case STATUS_PENDING:
                // If we are doing some logging, log that the file needed conversion
                if (this.logger) {
                    this.logger.setUnConverted();
                }

                this.emit('conversionpending');

                // Check status again after delay or
                // If status is none, request immediately since conversion
                // won't kick off until representation is requested
                this.statusTimeout = setTimeout(
                    () => {
                        this.updateStatus();
                    },
                    status === STATUS_NONE ? 0 : STATUS_UPDATE_INTERVAL_MS,
                );
                break;

            default:
            // no-op
        }
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
