import EventEmitter from 'events';
import { get, appendAuthParams } from './util';
import { STATUS_SUCCESS, STATUS_VIEWABLE } from './constants';

const STATUS_UPDATE_INTERVAL_MS = 2000;

const ERROR_PASSWORD_PROTECTED = 'error_password_protected';
const ERROR_TRY_AGAIN_LATER = 'error_try_again_later';
const ERROR_UNSUPPORTED_FORMAT = 'error_unsupported_format';
const ERROR_REFRESH = 'error_refesh';

class RepStatus extends EventEmitter {
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
     * @param {Object} options.representation - Representation object
     * @param {string} options.token - Access token
     * @param {string} options.sharedLink - Shared link
     * @param {string} options.sharedLinkPassword - Shared link password
     * @param {Object} [options.logger] - Optional logger instance
     * @return {RepStatus} RepStatus instance
     */
    constructor({ representation, token, sharedLink, sharedLinkPassword, logger }) {
        super();
        this.representation = representation;
        this.logger = logger;

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

        return get(this.infoUrl).then((info) => {
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
        let errorCode;
        switch (status) {
            case 'error':
                switch (RepStatus.getErrorCode(this.representation)) {
                    case ERROR_PASSWORD_PROTECTED:
                        errorCode = __(ERROR_PASSWORD_PROTECTED);
                        break;
                    case ERROR_TRY_AGAIN_LATER:
                        errorCode = __(ERROR_TRY_AGAIN_LATER);
                        break;
                    case ERROR_UNSUPPORTED_FORMAT:
                        errorCode = __(ERROR_UNSUPPORTED_FORMAT);
                        break;
                    default:
                        errorCode = __(ERROR_REFRESH);
                        break;
                }

                this.reject(errorCode);
                break;

            case STATUS_SUCCESS:
            case STATUS_VIEWABLE:
                this.resolve();
                break;

            case 'none':
            case 'pending':
                // If we are doing some logging, log that the file needed conversion
                if (this.logger) {
                    this.logger.setUnConverted();
                }

                this.emit('conversionpending');

                // Check status again after delay
                this.statusTimeout = setTimeout(() => {
                    this.updateStatus();
                }, STATUS_UPDATE_INTERVAL_MS);
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
