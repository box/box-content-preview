import AssetLoader from '../asset-loader';
import { ORIGINAL_REP_NAME } from '../../constants';
import { HTML_EXTENSIONS, TXT_EXTENSIONS } from './extensions';

const STATIC_URI = 'third-party/text/';

// Order of the viewers matters. Prefer original before others. Go from specific to general.
const VIEWERS = [
    {
        REP: 'text',
        EXT: ['csv', 'tsv'],
        JS: [`${STATIC_URI}papaparse.min.js`, 'csv.js'],
        CSS: ['csv.css'],
        NAME: 'CSV',
        PREFETCH: 'xhr'
    },
    {
        REP: 'text',
        EXT: ['md'],
        JS: [`${STATIC_URI}highlight.min.js`, 'markdown.js'],
        CSS: [`${STATIC_URI}github-markdown.css`, `${STATIC_URI}github.css`, 'markdown.css'],
        NAME: 'Markdown',
        PREFETCH: 'xhr'
    },
    {
        REP: ORIGINAL_REP_NAME,
        EXT: HTML_EXTENSIONS,
        JS: [`${STATIC_URI}highlight.min.js`, 'text.js'],
        CSS: [`${STATIC_URI}github.css`, 'text.css'],
        NAME: 'Text',
        PREFETCH: 'xhr'
    },
    {
        REP: 'text',
        EXT: TXT_EXTENSIONS,
        JS: [`${STATIC_URI}highlight.min.js`, 'text.js'],
        CSS: [`${STATIC_URI}github.css`, 'text.css'],
        NAME: 'Text',
        PREFETCH: 'xhr'
    }
];

class TextLoader extends AssetLoader {

    /**
     * [constructor]
     *
     * @returns {TextLoader} TextLoader instance
     */
    constructor() {
        super();
        this.viewers = VIEWERS;
    }
}

export default new TextLoader();
