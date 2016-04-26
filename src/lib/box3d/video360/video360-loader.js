import Base360Loader from '../base360-loader';
import Browser from '../../browser';
import autobind from 'autobind-decorator';

const STATIC_URI = 'third-party/';
const VIDEO_FORMATS = ['3g2', '3gp', 'avi', 'm2v', 'm2ts', 'm4v', 'mkv', 'mov', 'mp4', 'mpeg', 'mpg', 'mts', 'qt', 'wmv'];
const BROWSERS_SUPPORTED = ['Chrome', 'Edge', 'Firefox', 'Opera'];

const VIEWERS = [
    {
        REPRESENTATION: 'dash',
        EXTENSIONS: VIDEO_FORMATS,
        SCRIPTS: [
            `${STATIC_URI}media/shaka-player.js`,
            `${STATIC_URI}model3d/boxsdk.js`,
            `${STATIC_URI}model3d/box3d-resource-loader.js`,
            `${STATIC_URI}model3d/box3d-runtime.js`,
            'video360.js'
        ],
        STYLESHEETS: ['dash.css', 'video360.css'],
        CONSTRUCTOR: 'Video360',
        PREFETCH: 'xhr',
        REQUIRED_REPRESENTATIONS: [
            'manifest.mpd',
            'video/480/init.m4s',
            'video/1080/init.m4s',
            'audio/0/init.m4s',
            'video/480/1.m4s',
            'video/1080/1.m4s',
            'audio/0/1.m4s'
        ]
    }
];

@autobind
class Video360Loader extends Base360Loader {

    /**
     * Instantiates a loader for 360 degree video preview.
     * @returns {Video360Loader} Video360Loader instance
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
        const name = Browser.getName();

        // Check to see if we support playback in this browser
        // https://bugs.webkit.org/show_bug.cgi?id=135379
        const isSupportedBrowser = BROWSERS_SUPPORTED.some((browserName) => browserName === name);

        // If a 360 viewer but isn't a valid browser
        if (!isSupportedBrowser && !!viewer) {
            throw new Error('Your browser does not support 360 video playback');
        }

        return viewer;
    }
}

export default new Video360Loader();
