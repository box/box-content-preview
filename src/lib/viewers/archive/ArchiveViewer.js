/* eslint-disable no-unused-vars */
import get from 'lodash/get';
import BaseViewer from '../BaseViewer';
import PreviewError from '../../PreviewError';
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
                const contentUrl = this.createContentUrlWithAuthParams(template);
                this.startLoadTimer();

                return this.api.get(contentUrl);
            })
            .then(this.finishLoading)
            .catch(this.handleAssetError);
    }

    /**
     * Finishes loading the archive data
     *
     * @private
     * @param {Array<Object>} data - archive data collection
     * @return {void}
     */
    finishLoading = data => {
        if (this.isDestroyed()) {
            return;
        }

        try {
            /* global BoxArchive loaded from archive.js */
            this.archiveComponent = new BoxArchive(this.archiveEl, this.options.file.name, data);
        } catch (error) {
            throw new PreviewError(ERROR_CODE.LOAD_VIEWER, __('error_reupload'), error);
        }

        this.loaded = true;
        this.emit(VIEWER_EVENT.load);
    };
}

export default ArchiveViewer;
