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
        const isDicomFile = file.extension === 'boxdicom';
        const disableDicom = getProp(viewerOptions, 'IFrame.disableDicom');
        // The IFrame viewer is disabled when the file is a Boxdicom file and the disableDicom viewer option is enabled
        if (disableDicom && isDicomFile) {
            disabledViewers.push('IFrame');

            // Removes boxdicom as a supported extension
            const iframeViewer = this.viewers[0].EXT;
            if (iframeViewer) {
                this.viewers[0].EXT = iframeViewer.filter(extension => extension !== 'boxdicom');
            }
        }

        return super.determineViewer(file, disabledViewers);
    }
}

export default new IFrameLoader();
