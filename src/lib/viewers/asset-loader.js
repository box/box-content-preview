import {
    createContentUrl,
    prefetchAssets,
    loadStylesheets,
    loadScripts,
    createAssetUrlCreator,
    getHeaders,
    get
} from '../util';

class AssetLoader {

    /**
     * Determines if this loader can be used
     *
     * @public
     * @param {Object} file box file
     * @param {Array} [disabledViewers] List of disabled viewers
     * @returns {boolean} Is file supported
     */
    canLoad(file, disabledViewers = []) {
        return !!this.determineViewer(file, disabledViewers);
    }

    /**
     * Returns the available viewers
     *
     * @public
     * @returns {Array} list of supported viewers
     */
    getViewers() {
        return Array.isArray(this.viewers) ? this.viewers : [];
    }

    /**
     * Chooses a viewer based on file extension.
     *
     * @public
     * @param {Object} file box file
     * @param {Array} [disabledViewers] List of disabled viewers
     * @returns {Object} the viewer to use
     */
    determineViewer(file, disabledViewers = []) {
        return this.viewers.find((viewer) => {
            if (disabledViewers.indexOf(viewer.CONSTRUCTOR) > -1) {
                return false;
            }
            return viewer.EXTENSIONS.indexOf(file.extension) > -1 && file.representations.entries.some((entry) => viewer.REPRESENTATION === entry.representation);
        });
    }

    /**
     * Chooses a representation. Assumes that there will be only
     * one specific representation. In other words we will not have
     * two png representation entries with different properties.
     *
     * @public
     * @param {Object} file box file
     * @param {Object} viewer the chosen viewer
     * @returns {Object} the representation to load
     */
    determineRepresentation(file, viewer) {
        return file.representations.entries.find((entry) => viewer.REPRESENTATION === entry.representation);
    }

    /**
     * Polls info endpoint and waits for status success
     * from conversion when file is not ready
     *
     * @public
     * @param {RepStatus} instance of rep status
     * @returns {Promise} Promise to get success status
     */
    determineRepresentationStatus(repStatus) {
        // Load the representation assets
        return repStatus.success();
    }

    /**
     * Loads assets needed for a preview and finally loads the viewer
     *
     * @public
     * @param {Object} viewer chosen viewer
     * @param {Object} location template of assets
     * @returns {Promise} Promise to load scripts
     */
    load(viewer, location) {
        // Create an asset path creator function
        const assetUrlCreator = createAssetUrlCreator(location);

        // 1st load the stylesheets needed for this preview
        loadStylesheets(viewer.STYLESHEETS.map(assetUrlCreator));

        // Then load the scripts needed for this preview
        return loadScripts(viewer.SCRIPTS.map(assetUrlCreator));
    }

    /**
     * Prefetches assets and reps
     *
     * @public
     * @param {Object} file box file
     * @param {string} token auth token
     * @param {Object} location asset location
     * @param {string} sharedLink shared link
     * @param {string} password shared link password
     * @returns {void}
     */
    prefetch(file, token, location, sharedLink, sharedLinkPassword) {
        // Determine the viewer to use
        const viewer = this.determineViewer(file);

        // Determine the representation to use
        const representation = this.determineRepresentation(file, viewer);
        if (representation.status !== 'success') {
            return;
        }

        // Prefetch the stylesheets needed for this preview
        this.prefetchAssets(viewer, location);

        if (sharedLink && file.shared_link) {
            // Prefer the file scoped shared link over the globally provided shared link
            /* eslint-disable no-param-reassign */
            sharedLink = file.shared_link.url;
            /* eslint-enable no-param-reassign */
        }

        if (viewer.PREFETCH === 'xhr') {
            get(representation.links.content.url, getHeaders({}, token, sharedLink, sharedLinkPassword), 'any');
        } else {
            const img = document.createElement('img');
            img.crossOrigin = 'anonymous';
            img.src = createContentUrl(representation.links.content.url, token, sharedLink, sharedLinkPassword);
        }
    }

    /**
     * Prefetches assets
     *
     * @public
     * @param {Object} viewer
     * @param {Object} location asset location
     * @returns {void}
     */
    prefetchAssets(viewer, location) {
        // Create an asset path creator function
        const assetUrlCreator = createAssetUrlCreator(location);

        // Prefetch the stylesheets needed for this preview
        prefetchAssets(viewer.STYLESHEETS.map(assetUrlCreator));

        // Prefetch the scripts needed for this preview
        prefetchAssets(viewer.SCRIPTS.map(assetUrlCreator));
    }
}

export default AssetLoader;
