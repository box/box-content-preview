'use strict';

import autobind from 'autobind-decorator';
import fetch from 'isomorphic-fetch';

const STATUS_UPDATE_INTERVAL_IN_MILLIS = 2000;

@autobind
class RepStatus {

    /**
     * [constructor]
     * @param {Object} [logger] optional logger instance
     * @param {Array} [files] optional files to test
     * @returns {RepStatus} RepStatus instance
     */
    constructor(logger, files) {
        this.logger = logger;
        this.files = files || [];

        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }

    /**
     * Fetches status of a representation asset
     *
     * @param {Object} representation rep url
     * @param {Object} headers request headers
     * @returns {void}
     */
    updateStatus(representation, headers) {
        fetch(representation.links.info.url, {
            headers: headers
        })
        .then((response) => response.json())
        .then((info) => {
            clearTimeout(this.statusTimeout);
            representation.status = info.status;
            representation.links.files = info.files || [];
            this.handleResponse(representation, headers);
        });
    }

    /**
     * Handles the pending response
     *
     * @param {Object} representation box representation
     * @returns {Boolean} true if we should consider success
     */
    handlePending(representation) {
        // If no files to compare then return false
        if (this.files.length === 0) {
            return false;
        }

        // If no files in response then return false
        if (!representation.links.files || representation.links.files.length === 0) {
            return false;
        }

        // Compare all the files needed for psuedo-success
        return this.files.every((file) => {
            return representation.links.files.some((asset) => {
                return asset.url.endsWith(file);
            });
        });
    }

    /**
     * Gets the status of a representation asset
     *
     * @param {Object} representation box representation
     * @param {Object} headers request headers
     * @returns {void}
     */
    handleResponse(representation, headers) {
        switch (representation.status) {
            case 'error':
                if (representation.message) {
                    this.reject(representation.message.message);
                } else {
                    this.reject();
                }
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
                if (this.handlePending(representation)) {
                    this.resolve();
                } else {
                    this.statusTimeout = setTimeout(() => {
                        this.updateStatus(representation, headers);
                    }, STATUS_UPDATE_INTERVAL_IN_MILLIS);
                }

                break;
        }
    }

    /**
     * Gets the status of a representation asset
     *
     * @param {Object} representation box representation
     * @param {Object} headers request headers
     * @returns {Promise} Promise to detect represenation status
     */
    status(representation, headers) {
        this.handleResponse(representation, headers);
        return this.promise;
    }
}

export default RepStatus;
