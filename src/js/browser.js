'use strict';

import 'core-js/modules/es6.reflect';
import autobind from 'autobind-decorator';

const MIME_H264_BASELINE = 'video/mp4; codecs="avc1.42E01E"';
const MIME_H264_MAIN = 'video/mp4; codecs="avc1.4D401E"';
const MIME_H264_HIGH = 'video/mp4; codecs="avc1.64001E"';

let document = global.document;
let singleton = null; 

@autobind
class Browser {

    /**
     * [constructor]
     * @param {string|HTMLElement} event The mousemove event
     * @returns {Image}
     */
    constructor() {
        super();

        if (!singleton) {
            singleton = this;
        }

        return singleton;
    }

    /**
     * Mimicks HTML <audio> <video> canPlayType() and calls the native function.
     * @NOTE some older browsers return a "no"
     * Also see {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement|MDN}
     *
     * @param {String} type The mime type to check.
     * @param {String} probability Should either be 'maybe' or 'probably'
     * @returns {Boolean} true if browser supports a particular type
     */
    canPlayType(type, probability) {
        let elem;

        if (type.indexOf('audio/') === 0) {
            elem = document.createElement('audio');
        } else if (type.indexOf('video/') === 0) {
            elem = document.createElement('video');
        } else {
            return false;
        }
        return !!(elem.canPlayType && elem.canPlayType(type).replace(/^no$/, '') === probability);
    }

    /**
     * Checks if browser supports HTML5 <video> with H264 playback
     * Also see {@link https://wiki.whatwg.org/wiki/Video_type_parameters#Video_Codecs_3|W3C}
     * Also see {@link https://developer.mozilla.org/en-US/docs/HTML/Supported_media_formats|MDN}
     * @param {string} mime information about the AVC profile codec
     * @returns {Boolean} true if browser supports HTML5 H264 main video playback
     */
    canPlayH264(mime) {
        return canPlayType(mime, 'maybe') || canPlayType(mime, 'probably');
    }

    /**
     * Checks if browser supports HTML5 <video> with H264 baseline playback
     * Also see {@link https://wiki.whatwg.org/wiki/Video_type_parameters#Video_Codecs_3|W3C}
     * Also see {@link https://developer.mozilla.org/en-US/docs/HTML/Supported_media_formats|MDN}
     * @returns {Boolean} true if browser supports HTML5 H264 baseline video playback
     */
    canPlayH264Baseline() {
        return canPlayH264(MIME_H264_BASELINE);
    }

    /**
     * Checks if browser supports HTML5 <video> with H264 main playback
     * Also see {@link https://wiki.whatwg.org/wiki/Video_type_parameters#Video_Codecs_3|W3C}
     * Also see {@link https://developer.mozilla.org/en-US/docs/HTML/Supported_media_formats|MDN}
     * @returns {Boolean} true if browser supports HTML5 H264 main video playback
     */
    canPlayH264Main() {
        return canPlayH264(MIME_H264_MAIN);
    }

    /**
     * Checks if browser supports HTML5 <video> with H264 high playback
     * Also see {@link https://wiki.whatwg.org/wiki/Video_type_parameters#Video_Codecs_3|W3C}
     * Also see {@link https://developer.mozilla.org/en-US/docs/HTML/Supported_media_formats|MDN}
     * @returns {Boolean} true if browser supports HTML5 H264 high video playback
     */
    canPlayH264High() {
        return canPlayH264(MIME_H264_HIGH);
    }

    /**
     * Checks if browser supports HTML5 <audio> with MP3 playback.
     * @NOTE Unfortunately MP3 still requires a 'maybe' probablity check for some browsers
     * Also see {@link https://github.com/Modernizr/Modernizr/blob/master/feature-detects/audio.js|Modernizr}
     * Also see {@link https://developer.mozilla.org/en-US/docs/HTML/Supported_media_formats|MDN}
     * @returns {Boolean} true if browser supports HTML5 MP3 audio playback
     */
    canPlayMP3() {
        return canPlayType('audio/mpeg', 'maybe') || canPlayType('audio/mpeg', 'probably');
    }

    /**
     * Checks the browser for Dash support using H264 high.
     * Dash requires MediaSource extensions to exist and be applicable
     * to the H264 container (since we use H264 and not webm)
     *
     * @returns {Boolean} true if dash is usable
     */
    canPlayDash() {
        let mse = global.MediaSource;
        if (mse) {
            if (typeof mse.isTypeSupported === 'function') {
                return mse.isTypeSupported(MIME_H264_HIGH);
            } else {
                return this.canPlayH264High();
            }
        }
        return false;
    }

    /**
     * Checks the browser for Media Source Extensions support
     * @returns {Boolean} true if MediaSource extensions are enabled
     */
    hasMSE() {
        return !!global.MediaSource;
    }

    /**
     * Returns true if the browser supports webgl or experimental webgl
     * @returns {Boolean} - returns true if the browser supports WebGL
     */
    hasWebGL() {
        let gl,
            canvas = document.createElement('canvas');

        try {
            gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        } catch (e) {
            // no-op
        }

        return gl !== null && gl !== undefined;
    }

    /**
     * Determines if flash is installed.
     * @returns {Boolean} true if browser has flash
     */
    hasFlash() {
        let hasFlash = false;
        try {
            hasFlash = Boolean(new ActiveXObject('ShockwaveFlash.ShockwaveFlash'));
        } catch (exception) {
            hasFlash = ('undefined' != typeof navigator.mimeTypes['application/x-shockwave-flash']);
        }
        return hasFlash;
    }

    /**
     * Returns true if the browser supports SVG
     * @returns {Boolean}
     */
    hasSVG() {
        return document.implementation.hasFeature('http://www.w3.org/TR/SVG11/feature#BasicStructure', '1.1');
    }
});

export default new Browser();