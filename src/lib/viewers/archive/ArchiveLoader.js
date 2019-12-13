import AssetLoader from '../AssetLoader';
import ArchiveViewer from './ArchiveViewer';

const VIEWERS = [
    {
        NAME: 'Archive',
        CONSTRUCTOR: ArchiveViewer,
        REP: 'json',
        EXT: ['jar', 'zip'],
    },
];

class ArchiveLoader extends AssetLoader {
    viewers = VIEWERS;
}

export default new ArchiveLoader();
