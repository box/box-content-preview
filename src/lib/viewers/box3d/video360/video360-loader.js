import Base360Loader from '../base360-loader';
import Browser from '../../../browser';
import { replacePlaceholders } from '../../../util';

const STATIC_URI = 'third-party/';
const VIDEO_FORMATS = ['3g2', '3gp', 'avi', 'm2v', 'm2ts', 'm4v', 'mkv', 'mov', 'mp4', 'mpeg', 'mpg', 'mts', 'qt', 'wmv'];
const BROWSERS_SUPPORTED = ['Chrome', 'Edge', 'Firefox', 'Opera'];

const VIEWERS = [
    {
        REP: 'dash',
        EXT: VIDEO_FORMATS,
        JS: [
            `${STATIC_URI}media/shaka-player.js`,
            `${STATIC_URI}model3d/boxsdk.js`,
            `${STATIC_URI}model3d/box3d-runtime.js`,
            `${STATIC_URI}model3d/webvr-polyfill.js`,
            `${STATIC_URI}model3d/WebVR/VRConfig.js`,
            'video360.js'
        ],
        CSS: ['dash.css', 'video360.css'],
        NAME: 'Video360',
        PREFETCH: 'xhr',
        ASSET: 'manifest.mpd'
    }
];

class Video360Loader extends Base360Loader {

    /**
     * Instantiates a loader for 360 degree video preview.
     * @return {Video360Loader} Video360Loader instance
     */
    constructor() {
        super();
        this.viewers = VIEWERS;
    }

    /**
     * @inheritdoc
     */
    determineViewer(file, disabledViewers = []) {
        const viewer = super.determineViewer(file, disabledViewers);
        if (viewer) {
            const name = Browser.getName();
            const isIOS = Browser.isIOS();

            // Check to see if we support playback in this browser
            // https://bugs.webkit.org/show_bug.cgi?id=135379
            const isSupportedBrowser = BROWSERS_SUPPORTED.some((browserName) => browserName === name);

            // If a 360 viewer but isn't a valid browser OR
            // If a 360 viewer but it is on IOS OR
            // If browser doesn't support WebGL
            if (!isSupportedBrowser || isIOS || !Browser.hasWebGL()) {
                const message = replacePlaceholders(__('error_unsupported'), [__('360_videos')]);
                throw new Error(message);
            }
        }

        return viewer;
    }
}

export default new Video360Loader();
