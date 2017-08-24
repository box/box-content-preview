import Browser from './Browser';

/* eslint-disable no-undef */
const CLIENT_NAME = __NAME__;
const CLIENT_VERSION = __VERSION__;
/* eslint-enable no-undef */

class Logger {
    /**
     * [constructor]
     *
     * @param {string} locale - Locale
     * @return {Logger} Logger instance
     */
    constructor(locale) {
        this.start = Date.now();
        this.log = {
            locale,
            event: 'preview',
            browser: this.getBrowserInfo(),
            client: {
                name: CLIENT_NAME,
                version: CLIENT_VERSION
            },
            converted: true,
            cache: {
                hit: false,
                stale: false
            },
            time: {
                conversion: 0,
                rendering: 0,
                total: 0
            }
        };
    }

    /**
     * Gets browser capability information.
     *
     * @private
     * @return {Object} Browser capability information
     */
    getBrowserInfo() {
        return {
            name: Browser.getName(),
            swf: Browser.hasFlash(),
            svg: Browser.hasSVG(),
            mse: Browser.hasMSE(),
            webgl: Browser.hasWebGL(),
            mp3: Browser.canPlayMP3(),
            dash: Browser.canPlayDash(),
            box3d: Browser.supportsModel3D(),
            h264: {
                baseline: Browser.canPlayH264Baseline(),
                main: Browser.canPlayH264Main(),
                high: Browser.canPlayH264High()
            }
        };
    }

    /**
     * Marks file as cached.
     *
     * @public
     * @return {void}
     */
    setCached() {
        this.log.cache.hit = true;
    }

    /**
     * Marks file as stale cache.
     *
     * @public
     * @return {void}
     */
    setCacheStale() {
        this.log.cache.stale = true;
    }

    /**
     * Marks file as converted.
     *
     * @public
     * @return {void}
     */
    setUnConverted() {
        this.log.converted = false;
        this.log.time.conversion = Date.now() - this.start;
    }

    /**
     * Marks file as preloaded.
     *
     * @public
     * @return {void}
     */
    setPreloaded() {
        this.log.time.preload = Date.now() - this.start;
    }

    /**
     * Sets the file object.
     *
     * @public
     * @param {Object} file - file object
     * @return {void}
     */
    setFile(file) {
        this.log.file = file;
    }

    /**
     * Sets the file type.
     *
     * @public
     * @param {string} type - content type
     * @return {void}
     */
    setType(type) {
        this.log.type = type;
    }

    /**
     * Finishes logging.
     *
     * @public
     * @param {Object} count - Preview count
     * @return {Object} Metrics object
     */
    done(count) {
        this.log.count = count;
        this.log.time.total = Date.now() - this.start;
        this.log.time.rendering = this.log.time.total - this.log.time.conversion;
        return this.log;
    }
}

export default Logger;
