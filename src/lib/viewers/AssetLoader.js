class AssetLoader {
    /**
     * Determines if this loader can be used
     *
     * @param {Object} file - Box file
     * @param {Array} [disabledViewers] - List of disabled viewers
     * @return {boolean} Is file supported
     */
    canLoad(file, disabledViewers = []) {
        return !!this.determineViewer(file, disabledViewers);
    }

    /**
     * Returns the available viewers
     *
     * @return {Array} List of supported viewers
     */
    getViewers() {
        return Array.isArray(this.viewers) ? this.viewers : [];
    }

    /**
     * Chooses a viewer based on file extension.
     *
     * @param {Object} file - Box file
     * @param {Array} [disabledViewers] - List of disabled viewers
     * @return {Object} The viewer to use
     */
    determineViewer(file, disabledViewers = []) {
        const finalViewer = this.viewers.find((viewer) => {
            if (disabledViewers.indexOf(viewer.NAME) > -1) {
                return false;
            }
            return (
                viewer.EXT.indexOf(file.extension) > -1 &&
                file.representations.entries.some((entry) => viewer.REP === entry.representation)
            );
        });
        // console.log(finalViewer);
        return finalViewer;
    }

    /**
     * Chooses a representation. Assumes that there will be only
     * one specific representation. In other words we will not have
     * two png representation entries with different properties.
     *
     * @param {Object} file - Box file
     * @param {Object} viewer - The chosen viewer
     * @return {Object} The representation to load
     */
    determineRepresentation(file, viewer) {
        // console.log(file.representations.entries);
        const filePicked = file.representations.entries.find((entry) => viewer.REP === entry.representation);
        // console.log(filePicked);
        return filePicked;
    }
}

export default AssetLoader;
