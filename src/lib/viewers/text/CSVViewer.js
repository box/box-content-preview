import autobind from 'autobind-decorator';
import TextBaseViewer from './TextBaseViewer';
import { createAssetUrlCreator, get } from '../../util';
import { TEXT_STATIC_ASSETS_VERSION } from '../../constants';
import './CSV.scss';

const JS = [`third-party/text/${TEXT_STATIC_ASSETS_VERSION}/papaparse.min.js`, 'csv.js'];

@autobind class CSVViewer extends TextBaseViewer {
    /**
     * @inheritdoc
     */
    setup() {
        // Call super() first to set up common layout
        super.setup();

        this.csvEl = this.containerEl.appendChild(document.createElement('div'));
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
                get(papaWorkerUrl, 'blob').then((papaWorkerBlob) => {
                    /* global Papa */
                    const workerSrc = URL.createObjectURL(papaWorkerBlob);
                    Papa.SCRIPT_PATH = workerSrc;

                    const urlWithAuth = this.createContentUrlWithAuthParams(template);
                    Papa.parse(urlWithAuth, {
                        download: true,
                        error: (err, file, inputElem, reason) => {
                            this.emit('error', reason);
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

        const representation = this.options.representation;
        if (content && this.isRepresentationReady(representation)) {
            const template = representation.content.url_template;
            get(this.createContentUrlWithAuthParams(template), 'any');
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
        this.emit('load');
    }
}

export default CSVViewer;
