import autobind from 'autobind-decorator';
import TextBase from './text-base';
import { createAssetUrlCreator, get } from '../../util';
import './csv.scss';

const JS = ['third-party/text/papaparse.min.js', 'csv.js'];

@autobind
class CSV extends TextBase {
    /**
     * @inheritdoc
     */
    setup() {
        // Always call super 1st to have the common layout
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
        const { data, status } = representation;
        const assetUrlCreator = createAssetUrlCreator(location);
        const papaWorkerUrl = assetUrlCreator(JS[0]);

        return Promise.all([this.loadAssets(JS), status.getPromise()]).then(() => {
            get(papaWorkerUrl, 'blob')
            .then((papaWorkerBlob) => {
                /* global Papa */
                const workerSrc = URL.createObjectURL(papaWorkerBlob);
                Papa.SCRIPT_PATH = workerSrc;

                const urlWithAuth = this.createContentUrlWithAuthParams(data.content.url_template);
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
        }).catch(this.handleAssetError);
    }

    /**
     * Prefetches assets for dash.
     *
     * @return {void}
     */
    prefetch() {
        const template = this.options.representation.data.content.url_template;
        this.prefetchAssets(JS);
        get(this.createContentUrlWithAuthParams(template), 'any');
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

export default CSV;
