import EventEmitter from 'events';
import { get, appendAuthParams } from './util';
import { STATUS_SUCCESS, STATUS_VIEWABLE } from './constants';

const STATUS_UPDATE_INTERVAL_MS = 2000;

class RepStatus extends EventEmitter {
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

        return get(this.infoUrl)
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
