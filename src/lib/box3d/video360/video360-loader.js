import AssetLoader from '../../asset-loader';

const STATIC_URI = 'third-party/';
const VIDEO_FORMATS = ['360.3g2', '360.3gp', '360.avi', '360.m2v', '360.m2ts', '360.m4v', '360.mkv',
    '360.mov', '360.mp4', '360.mpeg', '360.mpg', '360.mts', '360.qt', '360.wmv'];

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

class Video360Loader extends AssetLoader {

    /**
     * Instantiates a loader for 360 degree video preview.
     * @returns {Video360Loader} Video360Loader instance
     */
    constructor() {
        super();
        this.viewers = VIEWERS;
    }
}

export default new Video360Loader();
