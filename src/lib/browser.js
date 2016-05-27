import autobind from 'autobind-decorator';

const MIME_H264_BASELINE = 'video/mp4; codecs="avc1.42E01E"';
const MIME_H264_MAIN = 'video/mp4; codecs="avc1.4D401E"';
const MIME_H264_HIGH = 'video/mp4; codecs="avc1.64001E"';
const EXT_STANDARD_DERIVATIVES = 'OES_standard_derivatives';
const EXT_FLOATING_POINT_TEXTURES = 'OES_texture_float';
const USER_AGENT = navigator.userAgent;

let name = undefined;
let gl = undefined;
let supportsWebGL = undefined;

@autobind
class Browser {

    static getName() {
        if (name) {
            return name;
        }

        if (USER_AGENT.indexOf('Edge/') > 0) {
            name = 'Edge';
        } else if (USER_AGENT.indexOf('OPR/') > 0) {
            name = 'Opera';
        } else if (USER_AGENT.indexOf('Chrome/') > 0) {
            name = 'Chrome';
        } else if (USER_AGENT.indexOf('Safari/') > 0) {
            name = 'Safari';
        } else if (USER_AGENT.indexOf('Trident/') > 0) {
            name = 'Explorer';
        } else if (USER_AGENT.indexOf('Firefox/') > 0) {
            name = 'Firefox';
        }

        return name;
    }

    /**
     * Mimicks HTML <audio> <video> canPlayType() and calls the native function.
     *
     * @NOTE some older browsers return a "no"
     * Also see {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement|MDN}
     *
     * @public
     * @param {String} type The mime type to check.
     * @param {String} probability Should either be 'maybe' or 'probably'
     * @returns {Boolean} true if browser supports a particular type
     */
    static canPlayType(type, probability) {
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
     *
     * Also see {@link https://wiki.whatwg.org/wiki/Video_type_parameters#Video_Codecs_3|W3C}
     * Also see {@link https://developer.mozilla.org/en-US/docs/HTML/Supported_media_formats|MDN}
     *
     * @public
     * @param {string} mime information about the AVC profile codec
     * @returns {Boolean} true if browser supports HTML5 H264 main video playback
     */
    static canPlayH264(mime) {
        return Browser.canPlayType(mime, 'maybe') || Browser.canPlayType(mime, 'probably');
    }

    /**
     * Checks if browser supports HTML5 <video> with H264 baseline playback
     *
     * Also see {@link https://wiki.whatwg.org/wiki/Video_type_parameters#Video_Codecs_3|W3C}
     * Also see {@link https://developer.mozilla.org/en-US/docs/HTML/Supported_media_formats|MDN}
     *
     * @public
     * @returns {Boolean} true if browser supports HTML5 H264 baseline video playback
     */
    static canPlayH264Baseline() {
        return Browser.canPlayH264(MIME_H264_BASELINE);
    }

    /**
     * Checks if browser supports HTML5 <video> with H264 main playback
     *
     * Also see {@link https://wiki.whatwg.org/wiki/Video_type_parameters#Video_Codecs_3|W3C}
     * Also see {@link https://developer.mozilla.org/en-US/docs/HTML/Supported_media_formats|MDN}
     *
     * @public
     * @returns {Boolean} true if browser supports HTML5 H264 main video playback
     */
    static canPlayH264Main() {
        return Browser.canPlayH264(MIME_H264_MAIN);
    }

    /**
     * Checks if browser supports HTML5 <video> with H264 high playback
     *
     * Also see {@link https://wiki.whatwg.org/wiki/Video_type_parameters#Video_Codecs_3|W3C}
     * Also see {@link https://developer.mozilla.org/en-US/docs/HTML/Supported_media_formats|MDN}
     *
     * @public
     * @returns {Boolean} true if browser supports HTML5 H264 high video playback
     */
    static canPlayH264High() {
        return Browser.canPlayH264(MIME_H264_HIGH);
    }

    /**
     * Checks if browser supports HTML5 <audio> with MP3 playback.
     *
     * @NOTE Unfortunately MP3 still requires a 'maybe' probablity check for some browsers
     * Also see {@link https://github.com/Modernizr/Modernizr/blob/master/feature-detects/audio.js|Modernizr}
     * Also see {@link https://developer.mozilla.org/en-US/docs/HTML/Supported_media_formats|MDN}
     *
     * @public
     * @returns {Boolean} true if browser supports HTML5 MP3 audio playback
     */
    static canPlayMP3() {
        return Browser.canPlayType('audio/mpeg', 'maybe') || Browser.canPlayType('audio/mpeg', 'probably');
    }

    /**
     * Checks the browser for Dash support using H264 high.
     * Dash requires MediaSource extensions to exist and be applicable
     * to the H264 container (since we use H264 and not webm)
     *
     * @public
     * @returns {Boolean} true if dash is usable
     */
    static canPlayDash() {
        const mse = global.MediaSource;
        let canPlayDash = false;
        if (mse) {
            if (typeof mse.isTypeSupported === 'function') {
                canPlayDash = mse.isTypeSupported(MIME_H264_HIGH);
            } else {
                canPlayDash = Browser.canPlayH264High();
            }
        }
        return canPlayDash;
    }

    /**
     * Checks the browser for Media Source Extensions support
     *
     * @public
     * @returns {Boolean} true if MediaSource extensions are enabled
     */
    static hasMSE() {
        return !!global.MediaSource;
    }

    /**
     * Returns true if the browser supports webgl or experimental webgl
     *
     * @public
     * @returns {Boolean} - returns true if the browser supports WebGL
     */
    static hasWebGL() {
        if (!gl) {
            const canvas = document.createElement('canvas');

            try {
                gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            } catch (e) {
                // no-op
            }
            supportsWebGL = (gl !== null && gl !== undefined);
        }

        return supportsWebGL;
    }

    /**
     * Returns true if the browser supports full capabilities required by
     * the Box3DRuntime for displaying Model Preview
     *
     * @public
     * @returns {Boolean} true if browser fully supports Model Previewing
     */
    static supportsModel3D() {
        if (!Browser.hasWebGL()) {
            return false;
        }

        const hasStandardDerivatives = !!gl.getExtension(EXT_STANDARD_DERIVATIVES);
        const hasFloatingPointTextures = !!gl.getExtension(EXT_FLOATING_POINT_TEXTURES);

        return hasStandardDerivatives && hasFloatingPointTextures;
    }

    /**
     * Determines if flash is installed.
     *
     * @public
     * @returns {Boolean} true if browser has flash
     */
    static hasFlash() {
        let hasFlash = false;
        try {
            hasFlash = Boolean(new ActiveXObject('ShockwaveFlash.ShockwaveFlash'));
        } catch (exception) {
            hasFlash = (typeof global.navigator.mimeTypes['application/x-shockwave-flash'] !== 'undefined');
        }
        return hasFlash;
    }

    /**
     * Returns true if the browser supports SVG
     *
     * @public
     * @returns {Boolean} is svg supported
     */
    static hasSVG() {
        return document.implementation.hasFeature('http://www.w3.org/TR/SVG11/feature#BasicStructure', '1.1');
    }

    /**
     * Returns whether the browser is a mobile browser. Taken from Modernizr:
     * https://github.com/Modernizr/Modernizr/blob/master/feature-detects/touchevents.js
     *
     * @returns {Boolean} true if browser is mobile
     */
    static isMobile() {
        return (('ontouchstart' in window) || (window.DocumentTouch && document instanceof DocumentTouch));
    }

    /**
     * Returns whether or not the device is running IOS
     *
     * @returns {Boolean} true if the device is running IOS
     */
    static isIOS() {
        return /(iPad|iPhone|iPod)/g.test(navigator.userAgent);
    }

    /**
     * Returns whether or not the device is running Android
     *
     * @returns {Boolean} true if the device is running Android
     */
    static isAndroid() {
        return /Android/g.test(navigator.userAgent);
    }
}

export default Browser;
