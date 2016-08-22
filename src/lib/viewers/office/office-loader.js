import AssetLoader from '../../asset-loader';

const STATIC_URI = 'third-party/doc/';
const SCRIPTS_DOCUMENT = [`${STATIC_URI}compatibility.js`, `${STATIC_URI}pdf.js`, `${STATIC_URI}pdf_viewer.js`, 'document.js'];
const OFFICE_CONSTRUCTOR = 'Office';
const FIVE_MB = 5242880;

// Order of the viewers matters. Prefer original before others. Go from specific to general.
const VIEWERS = [
    {
        REPRESENTATION: 'original',
        EXTENSIONS: ['xlsx'],
        SCRIPTS: ['office.js'],
        STYLESHEETS: [],
        CONSTRUCTOR: OFFICE_CONSTRUCTOR
    },
    {
        REPRESENTATION: 'pdf',
        EXTENSIONS: ['xlsx'],
        SCRIPTS: SCRIPTS_DOCUMENT,
        STYLESHEETS: [`${STATIC_URI}pdf_viewer.css`, 'document.css'],
        CONSTRUCTOR: 'Document',
        PREFETCH: 'xhr'
    }
];

class OfficeLoader extends AssetLoader {

    /**
     * [constructor]
     * @returns {OfficeLoader} OfficeLoader instance
     */
    constructor() {
        super();
        this.viewers = VIEWERS;
    }

    /**
     * @inheritdoc
     */
    determineViewer(file, disabledViewers = []) {
        // If the user does not have permission to download the file or the file is larger than 5MB, disable the Office viewer
        if (!file.permissions.can_download || file.size > FIVE_MB) {
            disabledViewers.push(OFFICE_CONSTRUCTOR);
        }

        return this.viewers.find((viewer) => {
            if (disabledViewers.indexOf(viewer.CONSTRUCTOR) > -1) {
                return false;
            }
            return viewer.EXTENSIONS.indexOf(file.extension) > -1 && file.representations.entries.some((entry) => viewer.REPRESENTATION === entry.representation);
        });
    }
}

export default new OfficeLoader();
