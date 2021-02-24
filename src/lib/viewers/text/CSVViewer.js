import PreviewError from '../../PreviewError';
import TextBaseViewer from './TextBaseViewer';
import { ERROR_CODE, VIEWER_EVENT } from '../../events';
import { TEXT_STATIC_ASSETS_VERSION } from '../../constants';
import './CSV.scss';

const JS = [`third-party/text/${TEXT_STATIC_ASSETS_VERSION}/papaparse.min.js`, 'csv.js'];
const PAPAPARSE_ERROR_TYPES = {
    DELIMITER: 'Delimiter',
    FIELD_MISMATCH: 'FieldMismatch',
    QUOTES: 'Quotes',
};
const ERROR_PRIORITY = {
    [PAPAPARSE_ERROR_TYPES.DELIMITER]: 0,
    [PAPAPARSE_ERROR_TYPES.QUOTES]: 1,
    [PAPAPARSE_ERROR_TYPES.FIELD_MISMATCH]: 2,
};

class CSVViewer extends TextBaseViewer {
    /**
     * @inheritdoc
     */
    setup() {
        if (this.isSetup) {
            return;
        }

        // Call super() first to set up common layout
        super.setup();

        this.csvEl = this.createViewer(document.createElement('div'));
        this.csvEl.className = 'bp-text bp-text-csv';
    }

    /**
     * [destructor]
     *
     * @return {void}
     */
    destroy() {
        if (this.csvComponent) {
            this.csvComponent.destroy();
        }
        super.destroy();
    }

    /**
     * Loads a csv file.
     *
     * @return {void}
     */
    load() {
        super.load();

        const { representation } = this.options;
        const template = representation.content.url_template;

        return Promise.all([this.loadAssets(JS), this.getRepStatus().getPromise()])
            .then(() => {
                this.startLoadTimer();
                const urlWithAuth = this.createContentUrlWithAuthParams(template);
                Papa.parse(urlWithAuth, {
                    download: true,
                    error: (err, file, inputElem, reason) => {
                        const error = new PreviewError(ERROR_CODE.LOAD_CSV, __('error_refresh'), { reason });
                        this.handleDownloadError(error, urlWithAuth);
                    },
                    complete: results => {
                        if (this.isDestroyed() || !results) {
                            return;
                        }

                        this.checkForParseErrors(results);

                        this.data = results.data;
                        this.finishLoading();
                    },
                    worker: true,
                });
            })
            .catch(this.handleAssetError);
    }

    /**
     * Checks for parse errors and if present triggers an error silently
     * @param {Array} results.errors Papaparse results errors array
     * @return {void}
     */
    checkForParseErrors({ errors = [] } = {}) {
        if (!errors.length) {
            return;
        }

        const parseError = this.getWorstParseError(errors);

        const error = new PreviewError(ERROR_CODE.PARSE_CSV, undefined, {
            ...parseError,
            silent: true,
        });

        this.triggerError(error);
    }

    /**
     * Utility to sort the PapaParse errors by most significant and returning the first.
     * The significance is defined as DELIMTER > QUOTES > FIELD_MISMATCH
     * @param {Array} errors Array of errors from PapaParse parse results
     * @return {Object} returns PapaParse error or undefined
     */
    getWorstParseError(errors = []) {
        return errors.sort((a, b) => ERROR_PRIORITY[a.type] - ERROR_PRIORITY[b.type])[0];
    }

    /**
     * Prefetches assets for CSV Viewer.
     *
     * @param {boolean} [options.assets] - Whether or not to prefetch static assets
     * @param {boolean} [options.content] - Whether or not to prefetch rep content
     * @return {void}
     */
    prefetch({ assets = true, content = true }) {
        if (assets) {
            this.prefetchAssets(JS);
        }

        const { representation } = this.options;
        if (content && this.isRepresentationReady(representation)) {
            const template = representation.content.url_template;
            this.api.get(this.createContentUrlWithAuthParams(template), { type: 'document' });
        }
    }

    /**
     * Resize handler
     *
     * @override
     * @return {void}
     */
    resize() {
        if (this.csvComponent) {
            this.csvComponent.renderCSV();
        }

        super.resize();
    }

    /**
     * Finishes loading the csv data
     *
     * @private
     * @return {void}
     */
    finishLoading() {
        /* global BoxCSV */
        this.csvComponent = new BoxCSV(this.csvEl, this.data);
        this.csvComponent.renderCSV();

        this.loadUI();
        this.loaded = true;
        this.emit(VIEWER_EVENT.load);
    }
}

export default CSVViewer;
