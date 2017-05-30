import AssetLoader from '../AssetLoader';
import PlainTextViewer from './PlainTextViewer';
import MarkdownViewer from './MarkdownViewer';
import CSVViewer from './CSVViewer';
import { ORIGINAL_REP_NAME } from '../../constants';
import { HTML_EXTENSIONS, TXT_EXTENSIONS } from './extensions';

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
}

export default new TextLoader();
