import Browser from './Browser';

const BROWSER_INFO = {
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
            browser: BROWSER_INFO,
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
     * Return elapsed time since logger was initialized.
     *
     * @return {number} Time in ms since initialization
     */
    getElapsedTime() {
        return Date.now() - this.start;
    }

    /**
     * Marks file as cached.
     *
     * @return {void}
     */
    setCached() {
        this.log.cache.hit = true;
    }

    /**
     * Marks file as stale cache.
     *
     * @return {void}
     */
    setCacheStale() {
        this.log.cache.stale = true;
    }

    /**
     * Marks file as converted.
     *
     * @return {void}
     */
    setUnConverted() {
        this.log.converted = false;
        this.log.time.conversion = Date.now() - this.start;
    }

    /**
     * Sets the file object.
     *
     * @param {Object} file - file object
     * @return {void}
     */
    setFile(file) {
        this.log.file = file;
    }

    /**
     * Sets the file type.
     *
     * @param {string} type - content type
     * @return {void}
     */
    setType(type) {
        this.log.type = type;
    }

    /**
     * Finishes logging.
     *
     * @param {Object} count - preview count
     * @return {Object} metrics
     */
    done(count) {
        this.log.count = count;
        this.log.time.total = Date.now() - this.start;
        this.log.time.rendering = this.log.time.total - this.log.time.conversion;
        return this.log;
    }

}

export default Logger;
