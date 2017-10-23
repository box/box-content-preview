import Base360Loader from '../Base360Loader';
import Browser from '../../../Browser';
import { replacePlaceholders } from '../../../util';
import Video360Viewer from './Video360Viewer';

const VIDEO_FORMATS = [
    '3g2',
    '3gp',
    'avi',
    'm2v',
    'm2ts',
    'm4v',
    'mkv',
    'mov',
    'mp4',
    'mpeg',
    'mpg',
    'mts',
    'qt',
    'wmv'
];
const BROWSERS_SUPPORTED = ['Chrome', 'Edge', 'Firefox', 'Opera', 'Safari'];

const VIEWERS = [
    {
        NAME: 'Video360',
        CONSTRUCTOR: Video360Viewer,
        REP: 'dash',
        EXT: VIDEO_FORMATS
    }
];

class Video360Loader extends Base360Loader {
    /**
     * Instantiates a loader for 360 degree video preview.
     *
     * @return {Video360Loader} Video360Loader instance
     */
    constructor() {
        super();
        this.viewers = VIEWERS;
    }

    /** @inheritdoc */
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
                const message = replacePlaceholders(__('error_browser_unsupported'), [__('360_videos')]);
                throw new Error(message);
            }
        }

        return viewer;
    }
}

export default new Video360Loader();
