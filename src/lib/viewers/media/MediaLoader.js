import AssetLoader from '../AssetLoader';
import { requires360Viewer, replacePlaceholders } from '../../util';
import MP3Viewer from './MP3Viewer';
import MP4Viewer from './MP4Viewer';
import DashViewer from './DashViewer';
import { ORIGINAL_REP_NAME } from '../../constants';

const VIDEO_FORMATS = [
    '3g2',
    '3gp',
    'avi',
    'flv',
    'm2v',
    'm2ts',
    'm4v',
    'mkv',
    'mov',
    'mp4',
    'mpeg',
    'mpg',
    'mts',
    'ogg',
    'qt',
    'ts',
    'wmv'
];

// Order of the viewers matters. Prefer original before others. Go from specific to general.
// For example, a mp3 file can be previewed both natively (majority use case) using the original
// representation but can fallback to using the mp3 representation (for watermarked versions).
const VIEWERS = [
    {
        NAME: 'MP3',
        CONSTRUCTOR: MP3Viewer,
        REP: ORIGINAL_REP_NAME,
        EXT: ['mp3']
    },
    {
        NAME: 'Dash',
        CONSTRUCTOR: DashViewer,
        REP: 'dash',
        EXT: VIDEO_FORMATS
    },
    {
        NAME: 'MP4',
        CONSTRUCTOR: MP4Viewer,
        REP: 'mp4',
        EXT: VIDEO_FORMATS
    },
    {
        NAME: 'MP3',
        CONSTRUCTOR: MP3Viewer,
        REP: 'mp3',
        EXT: ['aac', 'aif', 'aifc', 'aiff', 'amr', 'au', 'flac', 'm4a', 'mp3', 'ra', 'wav', 'wma']
    }
];

class MediaLoader extends AssetLoader {
    /**
     * [constructor]
     * @return {MediaLoader} MediaLoader instance
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
            const message = replacePlaceholders(__('error_browser_unsupported'), [__('360_videos')]);
            throw new Error(message);
        }

        return viewer;
    }
}

export default new MediaLoader();
