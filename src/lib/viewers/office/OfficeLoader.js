import getProp from 'lodash/get';
import AssetLoader from '../AssetLoader';
import Browser from '../../Browser';
import OfficeViewer from './OfficeViewer';
import { checkPermission } from '../../file';
import { OFFICE_ONLINE_EXTENSIONS } from '../../extensions';
import { ORIGINAL_REP_NAME, PERMISSION_DOWNLOAD } from '../../constants';

const FIVE_MB = 5242880;
const OFFICE_VIEWER_NAME = 'Office';

// Order of the viewers matters. Prefer original before others. Go from specific to general.
const VIEWERS = [
    {
        NAME: 'Office',
        CONSTRUCTOR: OfficeViewer,
        REP: ORIGINAL_REP_NAME,
        EXT: OFFICE_ONLINE_EXTENSIONS,
    },
];

class OfficeLoader extends AssetLoader {
    /**
     * [constructor]
     * @return {OfficeLoader} OfficeLoader instance
     */
    constructor() {
        super();
        this.viewers = VIEWERS;
    }

    /**
     * @inheritdoc
     */
    determineViewer(file, disabledViewers = [], viewerOptions = {}) {
        // The Office viewer is disabled when this is a password protected shared link
        const isDisabledDueToPasswordProtectedSharedLink = file.shared_link && file.shared_link.is_password_enabled;
        const maxFileSize = getProp(viewerOptions, 'Office.maxFileSize', FIVE_MB);
        // If the user does not have permission to download the file, the file is larger than max file size,
        // or isDisabledDueToSharedLink is true, then disable the Office viewer
        if (
            !checkPermission(file, PERMISSION_DOWNLOAD) ||
            file.size > maxFileSize ||
            isDisabledDueToPasswordProtectedSharedLink ||
            Browser.isIE() // Disable Office viewer if browser is Internet Explorer due to EOL
        ) {
            disabledViewers.push(OFFICE_VIEWER_NAME);
        }

        return super.determineViewer(file, disabledViewers);
    }
}

export default new OfficeLoader();
