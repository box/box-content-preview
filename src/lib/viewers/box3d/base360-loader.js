import AssetLoader from '../../asset-loader';
import Browser from '../../browser';
import { requires360Viewer } from '../../util';

class Base360Loader extends AssetLoader {

    /**
     * @inheritdoc
     */
    determineViewer(file, disabledViewers = []) {
        const viewer = super.determineViewer(file, disabledViewers);
        if (viewer && requires360Viewer(file) && Browser.hasWebGL()) {
            return viewer;
        }

        return undefined;
    }
}

export default Base360Loader;
