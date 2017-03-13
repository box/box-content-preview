import AssetLoader from '../AssetLoader';
import { requires360Viewer, replacePlaceholders } from '../../util';
import MP3 from './MP3';
import MP4 from './MP4';
import Dash from './Dash';
import { ORIGINAL_REP_NAME } from '../../constants';

const VIDEO_FORMATS = ['3g2', '3gp', 'avi', 'm2v', 'm2ts', 'm4v', 'mkv', 'mov', 'mp4', 'mpeg', 'mpg', 'ogg', 'mts', 'qt', 'wmv'];

// Order of the viewers matters. Prefer original before others. Go from specific to general.
// For example, a mp3 file can be previewed both natively (majority use case) using the original
// representation but can fallback to using the mp3 representation (for watermarked versions).
const VIEWERS = [
    {
        NAME: 'MP3',
        CONSTRUCTOR: MP3,
        REP: ORIGINAL_REP_NAME,
        EXT: ['mp3']
    },
    {
        NAME: 'Dash',
        CONSTRUCTOR: Dash,
        REP: 'dash',
        EXT: VIDEO_FORMATS
    },
    {
        NAME: 'MP4',
        CONSTRUCTOR: MP4,
        REP: 'mp4',
        EXT: VIDEO_FORMATS
    },
    {
        NAME: 'MP3',
        CONSTRUCTOR: MP3,
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
            const message = replacePlaceholders(__('error_unsupported'), [__('360_videos')]);
            throw new Error(message);
        }

        return viewer;
    }
}

export default new MediaLoader();
