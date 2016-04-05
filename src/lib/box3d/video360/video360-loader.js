import AssetLoader from '../../asset-loader';
import Browser from '../../browser';
import autobind from 'autobind-decorator';

const STATIC_URI = 'third-party/';
const VIDEO_FORMATS = ['3g2', '3gp', 'avi', 'm2v', 'm2ts', 'm4v', 'mkv', 'mov', 'mp4', 'mpeg', 'mpg', 'mts', 'qt', 'wmv'];

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
class Video360Loader extends AssetLoader {

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
        if (viewer) {
            // For now, we'll only support this preview if the filename has a secondary
            // extension of '360' (e.g. file.360.mp4)
            const basename = file.name.slice(0, file.name.lastIndexOf('.'));
            const subExt = basename.slice(basename.lastIndexOf('.') + 1);
            if (subExt === '360') {
                if (!Browser.hasWebGL()) {
                    throw new Error('Your Browser Doesn\'t support WebGL. Upgrade your browser to view 360° video.');
                }
                return viewer;
            }
        }
        return false;
    }
}

export default new Video360Loader();
