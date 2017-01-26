import AssetLoader from '../asset-loader';
import { ORIGINAL_REP_NAME } from '../../constants';

const OFFICE_CONSTRUCTOR = 'Office';
const FIVE_MB = 5242880;

// Order of the viewers matters. Prefer original before others. Go from specific to general.
const VIEWERS = [
    {
        REP: ORIGINAL_REP_NAME,
        EXT: ['xlsx'],
        NAME: OFFICE_CONSTRUCTOR
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
            disabledViewers.push(OFFICE_CONSTRUCTOR);
        }

        return super.determineViewer(file, disabledViewers);
    }
}

export default new OfficeLoader();
