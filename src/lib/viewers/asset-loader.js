class AssetLoader {
    /**
     * Determines if this loader can be used
     *
     * @public
     * @param {Object} file - box file
     * @param {Array} [disabledViewers] - List of disabled viewers
     * @return {boolean} Is file supported
     */
    canLoad(file, disabledViewers = []) {
        return !!this.determineViewer(file, disabledViewers);
    }

    /**
     * Returns the available viewers
     *
     * @public
     * @return {Array} list of supported viewers
     */
    getViewers() {
        return Array.isArray(this.viewers) ? this.viewers : [];
    }

    /**
     * Chooses a viewer based on file extension.
     *
     * @public
     * @param {Object} file - box file
     * @param {Array} [disabledViewers] - List of disabled viewers
     * @return {Object} the viewer to use
     */
    determineViewer(file, disabledViewers = []) {
        return this.viewers.find((viewer) => {
            if (disabledViewers.indexOf(viewer.NAME) > -1) {
                return false;
            }
            return viewer.EXT.indexOf(file.extension) > -1 && file.representations.entries.some((entry) => viewer.REP === entry.representation);
        });
    }

    /**
     * Chooses a representation. Assumes that there will be only
     * one specific representation. In other words we will not have
     * two png representation entries with different properties.
     *
     * @public
     * @param {Object} file - box file
     * @param {Object} viewer - the chosen viewer
     * @return {Object} the representation to load
     */
    determineRepresentation(file, viewer) {
        return file.representations.entries.find((entry) => viewer.REP === entry.representation);
    }
}

export default AssetLoader;
