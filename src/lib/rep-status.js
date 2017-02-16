import autobind from 'autobind-decorator';
import { get } from './util';

const STATUS_UPDATE_INTERVAL_IN_MILLIS = 2000;
const STATUS_SUCCESS = 'success';
const STATUS_VIEWABLE = 'viewable';

@autobind
class RepStatus {
    /**
     * Gets the status out of represenation
     *
     * @param {Object} representation - representation object
     * @return {string} rep status instance
     */
    static getStatus(representation) {
        let { status } = representation;
        status = typeof status === 'object' ? status.state : representation.temp_status.state;
        return status;
    }

    /**
     * Returns if status is considered success
     *
     * @param {Object} representation - representation object
     * @return {boolean} true if success or viewable
     */
    static isSuccess(representation) {
        const status = RepStatus.getStatus(representation);
        return status === STATUS_SUCCESS || status === STATUS_VIEWABLE;
    }

    /**
     * [constructor]
     *
     * @param {Object} representation - representation object
     * @param {Object} headers - request headers
     * @param {Object} [logger] - optional logger instance
     * @return {RepStatus} RepStatus instance
     */
    constructor(representation, headers, logger) {
        this.representation = representation;
        this.logger = logger;
        this.headers = headers;

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
     * @return {void}
     */
    updateStatus() {
        return get(this.representation.info.url, this.headers)
        .then((info) => {
            clearTimeout(this.statusTimeout);

            const status = (typeof info.status === 'object') ? info.status.state : info.temp_status.state;
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
        switch (status) {
            case 'error':
                this.reject();
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

                // Check status again after delay
                this.statusTimeout = setTimeout(() => {
                    this.updateStatus();
                }, STATUS_UPDATE_INTERVAL_IN_MILLIS);
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
