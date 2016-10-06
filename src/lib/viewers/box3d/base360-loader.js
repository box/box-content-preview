import AssetLoader from '../../asset-loader';
import Browser from '../../browser';
import autobind from 'autobind-decorator';
import { requires360Viewer } from '../../util';

@autobind
class Base360Loader extends AssetLoader {

    /**
     * @inheritdoc
     */
    determineViewer(file, disabledViewers = []) {
        const viewer = super.determineViewer(file, disabledViewers);
        if (viewer && requires360Viewer(file)) {
            if (!Browser.hasWebGL()) {
                throw new Error(__('error_no_webgl'));
            }

            return viewer;
        }
        return false;
    }
}

export default Base360Loader;
