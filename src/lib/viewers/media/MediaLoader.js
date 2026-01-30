import AssetLoader from '../AssetLoader';
import Browser from '../../Browser';
import { requires360Viewer, replacePlaceholders } from '../../util';
import MP3Viewer from './MP3Viewer';
import MP4Viewer from './MP4Viewer';
import DashViewer from './DashViewer';
import PreviewError from '../../PreviewError';
import { ORIGINAL_REP_NAME, PRELOAD_REP_NAME } from '../../constants';
import { ERROR_CODE } from '../../events';

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
    'wmv',
];

// Order of the viewers matters. Prefer original before others. Go from specific to general.
// For example, a mp3 file can be previewed both natively (majority use case) using the original
// representation but can fallback to using the mp3 representation (for watermarked versions).
const VIEWERS = [
    {
        NAME: 'MP3',
        CONSTRUCTOR: MP3Viewer,
        REP: ORIGINAL_REP_NAME,
        EXT: ['mp3'],
    },
    {
        NAME: 'Dash',
        CONSTRUCTOR: DashViewer,
        REP: 'dash',
        EXT: VIDEO_FORMATS,
    },
    {
        NAME: 'MP4',
        CONSTRUCTOR: MP4Viewer,
        REP: 'mp4',
        EXT: VIDEO_FORMATS,
    },
    {
        NAME: 'MP3',
        CONSTRUCTOR: MP3Viewer,
        REP: 'mp3',
        EXT: ['aac', 'aif', 'aifc', 'aiff', 'amr', 'au', 'flac', 'm4a', 'mp3', 'ra', 'wav', 'wma'],
    },
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
        let viewer = super.determineViewer(file, disabledViewers);
        if (viewer && requires360Viewer(file)) {
            const message = replacePlaceholders(__('error_browser_unsupported'), [__('360_videos')]);
            throw new PreviewError(ERROR_CODE.BROWSER_UNSUPPORTED, message, { file });
        }
        if (!viewer && file.representations && file.representations.entries) {
            const { entries } = file.representations;
            const hasJpg = entries.some(e => e.representation === PRELOAD_REP_NAME);
            const hasPlayable = entries.some(e => e.representation === 'dash' || e.representation === 'mp4');
            const isVideoByExt = file.extension && VIDEO_FORMATS.indexOf(file.extension) > -1;
            if (hasJpg && !hasPlayable && isVideoByExt) {
                const useDash = Browser.canPlayDash() && disabledViewers.indexOf('Dash') === -1;
                viewer = useDash ? this.viewers.find(v => v.NAME === 'Dash') : this.viewers.find(v => v.NAME === 'MP4');
            }
        }
        return viewer;
    }

    /**
     * @inheritdoc
     */
    determineRepresentation(file, viewer) {
        const rep = super.determineRepresentation(file, viewer);
        if (rep) {
            return rep;
        }
        if (
            viewer &&
            (viewer.NAME === 'Dash' || viewer.NAME === 'MP4') &&
            file.representations &&
            file.representations.entries
        ) {
            return file.representations.entries.find(e => e.representation === PRELOAD_REP_NAME);
        }
        return undefined;
    }
}

export default new MediaLoader();
