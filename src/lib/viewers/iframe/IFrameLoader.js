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
        EXT: ['boxnote', 'boxdicom'],
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
        const isDicomFile = file.name === 'Dicom.boxdicom' || file.extension === 'boxdicom';
        const openWithAmbraEnabled = getProp(viewerOptions, 'IFrame.openWithAmbra');
        // The IFrame viewer is disabled when the file is a Boxdicom file and Open_with_Ambra FF is enabled
        if (openWithAmbraEnabled && isDicomFile) {
            disabledViewers.push('IFrame');
        }

        return super.determineViewer(file, disabledViewers);
    }
}

export default new IFrameLoader();
