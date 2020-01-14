import React from 'react';
import ReactDOM from 'react-dom';
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
        this.archiveEl = archiveEl;
        ReactDOM.render(
            <ArchiveExplorer ref={this.setRef} filename={filename} itemCollection={data} />,
            this.archiveEl,
        );
    }

    /**
     * [destructor]
     *
     * @return {void}
     */
    destroy() {
        if (this.archiveExplorer) {
            ReactDOM.unmountComponentAtNode(this.archiveEl);
            this.archiveExplorer = null;
        }
    }

    setRef = archiveExplorer => {
        this.archiveExplorer = archiveExplorer;
    };
}

global.BoxArchive = BoxArchive;
export default BoxArchive;
