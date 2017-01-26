import AssetLoader from '../asset-loader';
import PlainText from './text';
import Markdown from './markdown';
import CSV from './csv';
import { ORIGINAL_REP_NAME } from '../../constants';
import { HTML_EXTENSIONS, TXT_EXTENSIONS } from './extensions';

const STATIC_URI = 'third-party/text/';

// Order of the viewers matters. Prefer original before others. Go from specific to general.
const VIEWERS = [
    {
        REP: 'text',
        EXT: ['csv', 'tsv'],
        JS: [`${STATIC_URI}papaparse.min.js`, 'csv.js'],
        NAME: CSV
    },
    {
        REP: 'text',
        EXT: ['md'],
        NAME: Markdown
    },
    {
        REP: ORIGINAL_REP_NAME,
        EXT: HTML_EXTENSIONS,
        NAME: PlainText
    },
    {
        REP: 'text',
        EXT: TXT_EXTENSIONS,
        NAME: PlainText
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
