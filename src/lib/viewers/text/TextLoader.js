import AssetLoader from '../AssetLoader';
import PlainText from './Text';
import Markdown from './Markdown';
import CSV from './CSV';
import { ORIGINAL_REP_NAME } from '../../constants';
import { HTML_EXTENSIONS, TXT_EXTENSIONS } from './extensions';

// Order of the viewers matters. Prefer original before others. Go from specific to general.
const VIEWERS = [
    {
        NAME: 'CSV',
        CONSTRUCTOR: CSV,
        REP: 'text',
        EXT: ['csv', 'tsv']
    },
    {
        NAME: 'Markdown',
        CONSTRUCTOR: Markdown,
        REP: 'text',
        EXT: ['md']
    },
    {
        NAME: 'Text',
        CONSTRUCTOR: PlainText,
        REP: ORIGINAL_REP_NAME,
        EXT: HTML_EXTENSIONS
    },
    {
        NAME: 'Text',
        CONSTRUCTOR: PlainText,
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
