import AssetLoader from '../asset-loader';
import Browser from '../browser';
import autobind from 'autobind-decorator';

@autobind
class Base360Loader extends AssetLoader {

    /**
     * @inheritdoc
     */
    determineViewer(file, disabledViewers = []) {
        const viewer = super.determineViewer(file, disabledViewers);
        if (viewer) {
            // For now, we'll only support this preview if the filename has a secondary
            // extension of '360' (e.g. file.360.mp4)
            const basename = file.name.slice(0, file.name.lastIndexOf('.'));
            const subExt = basename.slice(basename.lastIndexOf('.') + 1);
            if (subExt === '360') {
                if (!Browser.hasWebGL()) {
                    throw new Error('Your Browser Doesn\'t support WebGL. Upgrade your browser to view in 360° mode.');
                }
                return viewer;
            }
        }
        return false;
    }
}

export default Base360Loader;
