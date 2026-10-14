/* eslint-disable no-unused-vars */
import get from 'lodash/get';
import BaseViewer from '../BaseViewer';
import PreviewError from '../../PreviewError';
import { BLUEPRINT_MIGRATION_ARCHIVE } from '../../constants';
import { ERROR_CODE, VIEWER_EVENT } from '../../events';
import './Archive.scss';

const JS = ['archive.js'];
const CSS = ['archive.css'];

class ArchiveViewer extends BaseViewer {
    /**
     * @inheritdoc
     */
    setup() {
        if (this.isSetup) {
            return;
        }

        // Call super() first to set up common layout
        super.setup();

        this.archiveEl = this.createViewer(document.createElement('div'));
        this.archiveEl.className = 'bp-archive';
    }

    /**
     * [destructor]
     *
     * @return {void}
     */
    destroy() {
        if (this.archiveComponent) {
            this.archiveComponent.destroy();
        }
        super.destroy();
    }

    /**
     * Loads a archive file.
     *
     * @return {void}
     */
    load() {
        super.load();

        return Promise.all([this.loadAssets(JS, CSS), this.getRepStatus().getPromise()])
            .then(() => {
                const { representation } = this.options;
                const template = get(representation, 'content.url_template');
                this.startLoadTimer();

                const contentUrl = this.createContentUrlV2(template);
                return this.api.get(contentUrl, { headers: this.appendAuthHeader() });
            })
            .then(this.finishLoading)
            .catch(this.handleAssetError);
    }

    /**
     * Finishes loading the archive data
     *
     * @private
     * @param {Array<Object>} data - archive data collection
     * @return {Promise<void>|undefined} pending only when the v2 chunk is loading
     */
    finishLoading = data => {
        if (this.isDestroyed()) {
            return undefined;
        }

        try {
            /* global BoxArchive loaded from archive.js */
            this.archiveComponent = new BoxArchive(this.archiveEl, this.options.file.name, data, {
                isArchiveV2Enabled: this.isBlueprintEnabled() && this.featureEnabled(BLUEPRINT_MIGRATION_ARCHIVE),
                resin: this.options.resin,
            });
        } catch (error) {
            throw new PreviewError(ERROR_CODE.LOAD_VIEWER, __('error_reupload'), error);
        }

        const { ready } = this.archiveComponent;

        if (!ready) {
            this.finishRender();
            return undefined;
        }

        // Flag on: hold `load` until the v2 chunk has loaded and rendered
        return ready.then(
            () => {
                if (!this.isDestroyed()) {
                    this.finishRender();
                }
            },
            error => {
                throw new PreviewError(ERROR_CODE.LOAD_VIEWER, __('error_reupload'), error);
            },
        );
    };

    /**
     * Marks the viewer loaded once the archive has rendered
     *
     * @private
     * @return {void}
     */
    finishRender() {
        this.emitFirstRenderMetric();
        this.loaded = true;
        this.emit(VIEWER_EVENT.load);
    }
}

export default ArchiveViewer;
