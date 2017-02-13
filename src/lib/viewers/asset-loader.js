import { getRepresentation } from '../file';
import {
    appendAuthParams,
    prefetchAssets,
    loadStylesheets,
    loadScripts,
    createAssetUrlCreator,
    get,
    createContentUrl
} from '../util';

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

    /**
     * Polls info endpoint and waits for status success
     * from conversion when file is not ready
     *
     * @public
     * @param {RepStatus} instance - of rep status
     * @return {Promise} Promise to get success status
     */
    determineRepresentationStatus(repStatus) {
        // Load the representation assets
        return repStatus.success();
    }

    /**
     * Loads assets needed for a preview and finally loads the viewer
     *
     * @public
     * @param {Object} viewer - chosen viewer
     * @param {Object} location - template of assets
     * @return {Promise} Promise to load scripts
     */
    load(viewer, location) {
        // Create an asset path creator function
        const assetUrlCreator = createAssetUrlCreator(location);

        // 1st load the stylesheets needed for this preview
        loadStylesheets(viewer.CSS.map(assetUrlCreator));

        // Then load the scripts needed for this preview
        return loadScripts(viewer.JS.map(assetUrlCreator));
    }

    /**
     * Prefetches assets and representations for preview.
     *
     * @param {Object} file - Box file object
     * @param {string} token - Box access token
     * @param {string} sharedLink - Box shared link
     * @param {string} sharedLinkPassword - Box shared link password
     * @param {Object} location - Asset location object
     * @param {string} [preload] - Is this for a preload
     * @return {void}
     */
    prefetch(file, token, sharedLink, sharedLinkPassword, location, preload) {
        // Determine the viewer to use
        const viewer = this.determineViewer(file);

        // Determine the representation to use
        const representation = preload ?
            getRepresentation(file, viewer.PRELOAD) :
            this.determineRepresentation(file, viewer);
        if (!representation) {
            return;
        }

        const { content, use_paged_viewer: usePagedViewer, temp_status: tempStatus } = representation;
        const status = (typeof representation.status === 'object') ? representation.status.state : tempStatus.state;
        if (status !== 'success') {
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

        if (preload) {
            // @NOTE(tjin): Temporary until conversion provides first page representation
            const url = createContentUrl(content.url_template, 'page-1.png');
            const urlWithAuth = appendAuthParams(url, token, sharedLink, sharedLinkPassword);
            document.createElement('img').src = urlWithAuth;
        } else {
            // DELETE LINE BELOW
            const asset = usePagedViewer !== 'false' ? (viewer.ASSET || '') : '';
            // DELETE LINE ABOVE
            const url = createContentUrl(content.url_template, asset); // pass in viewer.ASSET
            const urlWithAuth = appendAuthParams(url, token, sharedLink, sharedLinkPassword);

            if (viewer.PREFETCH === 'xhr') {
                get(urlWithAuth, 'any');
            } else {
                // img, audio, video tags should be fetched using browser GET as they don't need CORS headers
                document.createElement(viewer.PREFETCH).src = urlWithAuth;
            }
        }
    }

    /**
     * Prefetches assets
     *
     * @public
     * @param {Object} viewer
     * @param {Object} location - asset location
     * @return {void}
     */
    prefetchAssets(viewer, location) {
        // Create an asset path creator function
        const assetUrlCreator = createAssetUrlCreator(location);

        // Prefetch the stylesheets needed for this preview
        prefetchAssets(viewer.CSS.map(assetUrlCreator));

        // Prefetch the scripts needed for this preview
        prefetchAssets(viewer.JS.map(assetUrlCreator));
    }
}

export default AssetLoader;
