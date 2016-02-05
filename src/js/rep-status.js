'use strict';

import autobind from 'autobind-decorator';
import fetch from 'isomorphic-fetch';

const STATUS_UPDATE_INTERVAL_IN_MILLIS = 3000;

@autobind
class RepLoader {

    /**
     * [constructor]
     * @param {Object} logger logger instance
     * @returns {RepLoader} RepLoader instance
     */
    constructor(logger) {
        this.logger = logger;
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }

    /**
     * Fetches status of a representation asset
     *
     * @param {String} url rep url
     * @param {Object} headers request headers
     * @returns {void}
     */
    updateStatus(url, headers) {
        fetch(url, {
            method: 'head',
            headers: headers
        }).then((response) => {
            clearTimeout(this.statusTimeout);
            switch (response.status) {
                case 200:
                    this.resolve();
                    break;
                case 202:
                    this.statusTimeout = setTimeout(() => {
                        this.updateStatus(url, headers);
                    }, STATUS_UPDATE_INTERVAL_IN_MILLIS);
                    break;
                default:
                    this.reject();
                    break;
            }
        });
    }

    /**
     * Gets the status of a representation asset
     *
     * @param {Object} representation box representation
     * @param {Object} headers request headers
     * @returns {Promise} Promise to detect represenation status
     */
    status(representation, headers) {

        let url = representation.links.content.url;

        switch (representation.status) {
            case 'success':
                this.resolve();
                break;
            case 'error':
                this.reject();
                break;
            case 'none':
            case 'pending':
                if (this.logger) {
                    // If we are doing some loggin, log that file needed conversion
                    this.logger.setUnConverted();
                }
                this.updateStatus(url, headers);
                break;
        }

        return this.promise;
    }
}

export default RepLoader;
