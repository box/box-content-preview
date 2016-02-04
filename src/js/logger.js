'use strict';

import autobind from 'autobind-decorator';
import Browser from './browser';

const BROWSER_INFO = {
    'name': Browser.getName(),
    'swf': Browser.hasFlash(),
    'svg': Browser.hasSVG(),
    'mse': Browser.hasMSE(),
    'webgl': Browser.hasWebGL(),
    'mp3': Browser.canPlayMP3(),
    'dash': Browser.canPlayDash(),
    'box3d': Browser.supportsBox3D(),
    'h264': {
        'baseline': Browser.canPlayH264Baseline(),
        'main': Browser.canPlayH264Main(),
        'high': Browser.canPlayH264High()
    }
};

@autobind
class Logger {

    /**
     * [constructor]
     * @param {Object} options options
     * @returns {Logger} Logger instance
     */
    constructor(options) {
        this.start = Date.now();
        this.metricsCallback = options.callbacks.metrics;
        this.log = {
            event: 'preview',
            browser: BROWSER_INFO,
            locale: options.location.locale,
            converted: true,
            cache: {
                hit: false,
                stale: false
            }
        };
    }

    /**
     * Marks file as cached.
     * @public
     * @returns {void}
     */
    setCached() {
        this.log.cache.hit = true;
    }

    /**
     * Marks file as stale cache.
     * @public
     * @returns {void}
     */
    setCacheStale() {
        this.log.cache.stale = true;
    }

    /**
     * Marks file as converted.
     * @public
     * @returns {void}
     */
    setUnConverted() {
        this.log.converted = false;
    }

    /**
     * Sets the file object.
     * @public
     * @param {Object} file file object
     * @returns {void}
     */
    setFile(file) {
        this.log.file = file;
    }

    /**
     * Sets the file type.
     * @public
     * @param {String} type content type
     * @returns {void}
     */
    setType(type) {
        this.log.type = type;
    }

    /**
     * Finishes logging.
     * @public
     * @returns {void}
     */
    done() {
        this.log.time = Date.now() - this.start;
        if (typeof this.metricsCallback === 'function') {
            this.metricsCallback(this.log);
        } else {
            console.log(this.log);
        }
    }

}

export default Logger;