import AssetLoader from '../AssetLoader';
import PlainTextViewer from './PlainTextViewer';
import MarkdownViewer from './MarkdownViewer';
import CSVViewer from './CSVViewer';
import { isVeraProtectedFile } from '../../util';
import { ORIGINAL_REP_NAME } from '../../constants';
import { HTML_EXTENSIONS, TXT_EXTENSIONS } from '../../extensions';

// Order of the viewers matters. Prefer original before others. Go from specific to general.
const VIEWERS = [
    {
        NAME: 'CSV',
        CONSTRUCTOR: CSVViewer,
        REP: 'text',
        EXT: ['csv', 'tsv']
    },
    {
        NAME: 'Markdown',
        CONSTRUCTOR: MarkdownViewer,
        REP: 'text',
        EXT: ['md']
    },
    {
        NAME: 'Text',
        CONSTRUCTOR: PlainTextViewer,
        REP: ORIGINAL_REP_NAME,
        EXT: HTML_EXTENSIONS
    },
    {
        NAME: 'Text',
        CONSTRUCTOR: PlainTextViewer,
        REP: 'text',
        EXT: TXT_EXTENSIONS
    }
];

class TextLoader extends AssetLoader {
    /**
     * [constructor]
     *
     * @return {TextLoader} TextLoader instance
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

        // If file is a Vera-protected file, do not return the TextLoader and instead let
        // the determineViewer check fall back to the PDF document viewer, which renders
        // the file - Vera wraps their encrypted files in a HTML file that when rendered,
        // displays a Vera-branded message to view the file with Vera's application
        if (viewer && isVeraProtectedFile(file)) {
            return undefined;
        }

        return viewer;
    }
}

export default new TextLoader();
