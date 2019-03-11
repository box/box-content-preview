import api from '../../api';
import TextBaseViewer from './TextBaseViewer';
import { createAssetUrlCreator } from '../../util';
import { TEXT_STATIC_ASSETS_VERSION } from '../../constants';
import './CSV.scss';
import { ERROR_CODE, VIEWER_EVENT } from '../../events';
import PreviewError from '../../PreviewError';

const JS = [`third-party/text/${TEXT_STATIC_ASSETS_VERSION}/papaparse.min.js`, 'csv.js'];

class CSVViewer extends TextBaseViewer {
    /**
     * @inheritdoc
     */
    setup() {
        if (this.isSetup()) {
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
        this.setup();
        super.load();

        const { representation, location } = this.options;
        const template = representation.content.url_template;
        const assetUrlCreator = createAssetUrlCreator(location);
        const papaWorkerUrl = assetUrlCreator(JS[0]);

        return Promise.all([this.loadAssets(JS), this.getRepStatus().getPromise()])
            .then(() => {
                api.get(papaWorkerUrl, { type: 'blob' }).then((papaWorkerBlob) => {
                    /* global Papa */
                    const workerSrc = URL.createObjectURL(papaWorkerBlob);
                    Papa.SCRIPT_PATH = workerSrc;

                    this.startLoadTimer();
                    const urlWithAuth = this.createContentUrlWithAuthParams(template);
                    Papa.parse(urlWithAuth, {
                        download: true,
                        error: (err, file, inputElem, reason) => {
                            const error = new PreviewError(ERROR_CODE.LOAD_CSV, __('error_refresh'), { reason });
                            this.handleDownloadError(error, urlWithAuth);
                        },
                        complete: (results) => {
                            if (this.isDestroyed() || !results) {
                                return;
                            }
                            this.data = results.data;
                            this.finishLoading();
                            URL.revokeObjectURL(workerSrc);
                        }
                    });
                });
            })
            .catch(this.handleAssetError);
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
            api.get(this.createContentUrlWithAuthParams(template), { type: 'document' });
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
