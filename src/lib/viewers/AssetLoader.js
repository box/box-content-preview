class AssetLoader {
    /**
     * Determines if this loader can be used
     *
     * @param {Object} file - Box file
     * @param {Array} [disabledViewers] - List of disabled viewers
     * @param {Object} viewerOptions - Custom options for viewers
     * @return {boolean} Is file supported
     */
    canLoad(file, disabledViewers = [], viewerOptions = {}) {
        return !!this.determineViewer(file, disabledViewers, viewerOptions);
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
     * @param {Object} viewerOptions - Custom options for viewers
     * @return {Object} The viewer to use
     */
    // eslint-disable-next-line no-unused-vars
    determineViewer(file, disabledViewers = [], viewerOptions = {}) {
        return this.viewers.find(viewer => {
            if (disabledViewers.indexOf(viewer.NAME) > -1) {
                return false;
            }
            return (
                viewer.EXT.indexOf(file.extension) > -1 &&
                file.representations.entries.some(entry => viewer.REP === entry.representation)
            );
        });
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
        return file.representations.entries.find(entry => viewer.REP === entry.representation);
    }
}

export default AssetLoader;
