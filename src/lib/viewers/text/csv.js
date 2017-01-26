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
     * Returns the name of the viewer
     *
     * @override
     * @returns {string} csv
     */
    getName() {
        return 'CSV';
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

        const { representation, location } = this.options;
        const { data, status } = representation;
        const { content } = data;
        const { url_template: template } = content;
        const assetUrlCreator = createAssetUrlCreator(location);
        const papaWorkerUrl = assetUrlCreator(JS[0]);

        Promise.all(this.loadAssets(JS), status.getPromise()).then(() => {
            get(papaWorkerUrl, 'blob')
            .then((papaWorkerBlob) => {
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
        });

        super.load();
    }

    /**
     * Prefetches assets for dash.
     *
     * @return {void}
     */
    prefetch() {
        const { url_template: template } = this.options.representation.data.content;
        this.prefetchAssets(JS);
        get(this.createContentUrlWithAuthParams(template), 'any');
    }

    /**
     * Resize handler
     *
     * @override
     * @return {void}
     * @protected
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
     * @return {void}
     * @private
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
