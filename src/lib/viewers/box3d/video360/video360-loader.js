import Base360Loader from '../base360-loader';
import Browser from '../../../browser';
import { replacePlaceholders } from '../../../util';
import Video360 from './video360';

const VIDEO_FORMATS = ['3g2', '3gp', 'avi', 'm2v', 'm2ts', 'm4v', 'mkv', 'mov', 'mp4', 'mpeg', 'mpg', 'mts', 'qt', 'wmv'];
const BROWSERS_SUPPORTED = ['Chrome', 'Edge', 'Firefox', 'Opera'];

const VIEWERS = [
    {
        NAME: 'Video360',
        CONSTRUCTOR: Video360,
        REP: 'dash',
        EXT: VIDEO_FORMATS
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
