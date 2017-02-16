import AssetLoader from '../asset-loader';
import Office from './office';
import { ORIGINAL_REP_NAME } from '../../constants';

const FIVE_MB = 5242880;
const OFFICE_VIEWER_NAME = 'Office';

// Order of the viewers matters. Prefer original before others. Go from specific to general.
const VIEWERS = [
    {
        NAME: 'Office',
        CONSTRUCTOR: Office,
        REP: ORIGINAL_REP_NAME,
        EXT: ['xlsx']
    }
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
    determineViewer(file, disabledViewers = []) {
        // The Office viewer is disabled when this is a password protected shared link
        const isDisabledDueToPasswordProtectedSharedLink = file.shared_link && file.shared_link.is_password_enabled;
        // If the user does not have permission to download the file, the file is larger than 5MB, or isDisabledDueToSharedLink is true,
        // then disable the Office viewer
        if (!file.permissions.can_download || file.size > FIVE_MB || isDisabledDueToPasswordProtectedSharedLink) {
            disabledViewers.push(OFFICE_VIEWER_NAME);
        }

        return super.determineViewer(file, disabledViewers);
    }
}

export default new OfficeLoader();
