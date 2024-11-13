import React from 'react';
import { createRoot } from 'react-dom/client';
import ArchiveExplorer from './ArchiveExplorer';

class BoxArchive {
    /**
     * [constructor]
     *
     * @param {HTMLElement} archiveEl - Archive element
     * @param {Object} data - Archive data
     * @return {BoxArchive} Instance
     */
    constructor(archiveEl, filename, data) {
        this.root = createRoot(archiveEl);
        this.root.render(<ArchiveExplorer ref={this.setRef} filename={filename} itemCollection={data} />);
    }

    /**
     * [destructor]
     *
     * @return {void}
     */
    destroy() {
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
