import getProp from 'lodash/get';
import AssetLoader from '../AssetLoader';
import IFrameViewer from './IFrameViewer';
import { ORIGINAL_REP_NAME } from '../../constants';

// Order of the viewers matters. Prefer original before others. Go from specific to general.
const VIEWERS = [
    {
        NAME: 'IFrame',
        CONSTRUCTOR: IFrameViewer,
        REP: ORIGINAL_REP_NAME,
        EXT: ['boxdicom'],
    },
    {
        NAME: 'IFrame',
        CONSTRUCTOR: IFrameViewer,
        REP: ORIGINAL_REP_NAME,
        EXT: ['boxnote'],
    },
];

class IFrameLoader extends AssetLoader {
    /**
     * [constructor]
     *
     * @return {IFrameLoader} IFrameLoader instance
     */
    constructor() {
        super();
        this.viewers = VIEWERS;
    }

    /**
     * @inheritdoc
     */
    determineViewer(file, disabledViewers = [], viewerOptions = {}) {
        const isDicomFile = file.extension === 'boxdicom';
        const disableDicom = getProp(viewerOptions, 'IFrame.disableDicom');
        // Removes boxdicom as a supported extension when the file is a Boxdicom file and the disableDicom viewer option is enabled
        if (disableDicom && isDicomFile) {
            this.viewers = this.viewers.filter(viewer => !viewer.EXT.includes('boxdicom'));
        }

        return super.determineViewer(file, disabledViewers);
    }
}

export default new IFrameLoader();
