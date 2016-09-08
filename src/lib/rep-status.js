import autobind from 'autobind-decorator';
import { get } from './util';

const STATUS_UPDATE_INTERVAL_IN_MILLIS = 2000;

@autobind
class RepStatus {

    /**
     * [constructor]
     *
     * @param {Object} representation rep url
     * @param {Object} headers request headers
     * @param {Object} [logger] optional logger instance
     * @param {Array} [files] optional files to test
     * @returns {RepStatus} RepStatus instance
     */
    constructor(representation, headers, logger, files) {
        this.representation = representation;
        this.logger = logger;
        this.headers = headers;
        this.files = files || [];

        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }

    /**
     * Fetches status of a representation asset
     *
     * @private
     * @returns {void}
     */
    updateStatus() {
        return get(this.representation.links.info.url, this.headers)
        .then((info) => {
            clearTimeout(this.statusTimeout);
            this.representation.status = info.status;
            this.representation.links.files = info.files || [];
            this.handleResponse();
        });
    }

    /**
     * Handles the pending response
     *
     * @private
     * @returns {boolean} true if we should consider success
     */
    handlePending() {
        // If no files to compare then return false
        if (this.files.length === 0) {
            return false;
        }

        // If no files in response then return false
        if (!this.representation.links.files || this.representation.links.files.length === 0) {
            return false;
        }

        // Compare all the files needed for psuedo-success
        return this.files.every((file) => {
            return this.representation.links.files.some((asset) => {
                return asset.url.endsWith(file);
            });
        });
    }

    /**
     * Gets the status of a representation asset
     *
     * @private
     * @returns {void}
     */
    handleResponse() {
        switch (this.representation.status) {
            case 'error':
                this.reject();
                break;

            case 'success':
                this.resolve();
                break;

            case 'none':
            case 'pending':
                // If we are doing some loggin, log that the file needed conversion
                if (this.logger) {
                    this.logger.setUnConverted();
                }

                // If files to test were passed in then a logical success status
                // is dependent on them and not just status success. This will be
                // used for multi-assets files like Dash
                if (this.handlePending()) {
                    this.resolve();
                } else {
                    this.statusTimeout = setTimeout(() => {
                        this.updateStatus();
                    }, STATUS_UPDATE_INTERVAL_IN_MILLIS);
                }
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
