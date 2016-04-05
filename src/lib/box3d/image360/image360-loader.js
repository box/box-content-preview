import AssetLoader from '../../asset-loader';
import Browser from '../../browser';
import autobind from 'autobind-decorator';

const STATIC_URI = 'third-party/model3d/';
const VIEWERS = [
    {
        REPRESENTATION: 'original',
        EXTENSIONS: ['jpg', 'png'],
        SCRIPTS: [`${STATIC_URI}boxsdk.js`, `${STATIC_URI}box3d-resource-loader.js`,
            `${STATIC_URI}box3d-runtime.js`, 'image360.js'],
        STYLESHEETS: ['image360.css'],
        CONSTRUCTOR: 'Image360'
    },
    {
        REPRESENTATION: 'png',
        EXTENSIONS: ['ai', 'bmp', 'dcm', 'eps', 'gif', 'ps', 'psd', 'svg', 'svs', 'tga', 'tif', 'tiff'],
        SCRIPTS: [`${STATIC_URI}boxsdk.js`, `${STATIC_URI}box3d-resource-loader.js`,
            `${STATIC_URI}box3d-runtime.js`, 'image360.js'],
        STYLESHEETS: ['image360.css'],
        CONSTRUCTOR: 'Image360'
    }
];

@autobind
class Image360Loader extends AssetLoader {

    /**
     * Instantiates a loader for 360 degree image preview.
     * @constructor
     * @returns {Image360Loader} The image360 loader instance
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
            // extension of '360' (e.g. file.360.jpg)
            const basename = file.name.slice(0, file.name.lastIndexOf('.'));
            const subExt = basename.slice(basename.lastIndexOf('.') + 1);
            if (subExt === '360') {
                if (!Browser.hasWebGL()) {
                    throw new Error('Your Browser Doesn\'t support WebGL. Upgrade your browser to view 360° images.');
                }
                return viewer;
            }
        }
        return false;
    }
}

export default new Image360Loader();
