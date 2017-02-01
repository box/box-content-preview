import AssetLoader from '../asset-loader';
import { requires360Viewer, replacePlaceholders } from '../../util';
import { ORIGINAL_REP_NAME } from '../../constants';

const STATIC_URI = 'third-party/media/';
const VIDEO_FORMATS = ['3g2', '3gp', 'avi', 'm2v', 'm2ts', 'm4v', 'mkv', 'mov', 'mp4', 'mpeg', 'mpg', 'ogg', 'mts', 'qt', 'wmv'];

// Order of the viewers matters. Prefer original before others. Go from specific to general.
// For example, a mp3 file can be previewed both natively (majority use case) using the original
// representation but can fallback to using the mp3 representation (for watermarked versions).
const VIEWERS = [
    {
        REP: ORIGINAL_REP_NAME,
        EXT: ['mp3'],
        JS: ['mp3.js'],
        CSS: ['mp3.css'],
        NAME: 'MP3',
        PREFETCH: 'audio'
    },
    {
        REP: 'dash',
        EXT: VIDEO_FORMATS,
        JS: [`${STATIC_URI}shaka-player.js`, 'dash.js'],
        CSS: ['dash.css'],
        NAME: 'Dash',
        PREFETCH: 'xhr',
        ASSET: 'manifest.mpd'
    },
    {
        REP: 'mp4',
        EXT: VIDEO_FORMATS,
        JS: ['mp4.js'],
        CSS: ['mp4.css'],
        NAME: 'MP4',
        PREFETCH: 'video'
    },
    {
        REP: 'mp3',
        EXT: ['aac', 'aif', 'aifc', 'aiff', 'amr', 'au', 'flac', 'm4a', 'mp3', 'ra', 'wav', 'wma'],
        JS: ['mp3.js'],
        CSS: ['mp3.css'],
        NAME: 'MP3',
        PREFETCH: 'audio'
    }
];

class MediaLoader extends AssetLoader {

    /**
     * [constructor]
     * @returns {MediaLoader} MediaLoader instance
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
        if (viewer && requires360Viewer(file)) {
            const message = replacePlaceholders(__('error_unsupported'), [__('360_videos')]);
            throw new Error(message);
        }

        return viewer;
    }
}

export default new MediaLoader();
