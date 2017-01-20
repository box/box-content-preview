import autobind from 'autobind-decorator';
import { get } from './util';

const STATUS_UPDATE_INTERVAL_IN_MILLIS = 2000;

@autobind
class RepStatus {

    /**
     * [constructor]
     *
     * @param {Object} representation representation object
     * @param {Object} headers request headers
     * @param {Object} [logger] optional logger instance
     * @returns {RepStatus} RepStatus instance
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
     * @returns {void}
     */
    destroy() {
        clearTimeout(this.statusTimeout);
    }

    /**
     * Fetches status of a representation asset
     *
     * @private
     * @returns {void}
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
     * @returns {void}
     */
    handleResponse() {
        const status = (typeof this.representation.status === 'object') ? this.representation.status.state : this.representation.temp_status.state;
        switch (status) {
            case 'error':
                this.reject();
                break;

            case 'success':
            case 'viewable':
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
     * Gets the status of a representation asset
     *
     * @public
     * @returns {Promise} Promise to detect represenation status
     */
    success() {
        this.handleResponse();
        return this.promise;
    }
}

export default RepStatus;
