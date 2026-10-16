import React from 'react';
import { createRoot } from 'react-dom/client';
import ArchiveExplorer from './ArchiveExplorer';

class BoxArchive {
    /**
     * [constructor]
     *
     * @param {HTMLElement} archiveEl - Archive element
     * @param {string} filename - Archive file name
     * @param {Object} data - Archive data
     * @param {Object} [options] - Archive options
     * @param {boolean} [options.isArchiveV2Enabled] - Whether to render the Blueprint UI, loaded as its own chunk
     * @param {Object} [options.resin] - Resin analytics instance from the viewer options
     * @return {BoxArchive} Instance
     */
    constructor(archiveEl, filename, data, { isArchiveV2Enabled = false, resin } = {}) {
        this.archiveEl = archiveEl;
        this.data = data;
        this.filename = filename;
        this.resin = resin;
        this.root = createRoot(archiveEl);

        if (!isArchiveV2Enabled) {
            this.render();
            return;
        }

        // Resolves once the v2 chunk has loaded and rendered, rejects if the chunk cannot load
        this.ready = this.importV2().then(v2 => {
            if (!this.destroyed) {
                this.render(v2);
            }
        });
    }

    /**
     * @return {Promise<Object>} archive v2 module: ArchiveTableV2, BlueprintProviders, BreadcrumbsV2, SearchBarV2
     */
    importV2() {
        return import(/* webpackChunkName: "archive-v2" */ './ArchiveV2');
    }

    /**
     * Renders the explorer, inside the v2 Blueprint providers when the v2 module is given
     *
     * @param {Object} [v2] - archive v2 module
     * @return {void}
     */
    render(v2) {
        const explorer = (
            <ArchiveExplorer
                ref={this.setRef}
                filename={this.filename}
                itemCollection={this.data}
                resin={this.resin}
                v2={v2}
            />
        );

        this.root.render(
            v2 ? <v2.BlueprintProviders container={this.archiveEl}>{explorer}</v2.BlueprintProviders> : explorer,
        );
    }

    /**
     * [destructor]
     *
     * @return {void}
     */
    destroy() {
        this.destroyed = true;

        if (this.archiveExplorer) {
            this.root.unmount();
            this.archiveExplorer = null;
        }
    }

    setRef = archiveExplorer => {
        this.archiveExplorer = archiveExplorer;
    };
}

global.BoxArchive = BoxArchive;
export default BoxArchive;
