import Base from '../base';

const SWF_PARAMS = {
    allowfullscreen: 'true',
    allowFullScreen: 'true',
    allownetworking: 'none',
    allowNetworking: 'none',
    allowscriptaccess: 'never',
    allowScriptAccess: 'never',
    wmode: 'transparent'
};

const JS = ['third-party/swf/swfobject.js'];

class SWF extends Base {
    /**
     * @inheritdoc
     */
    setup() {
        // Call super() first to set up common layout
        super.setup();
        this.playerEl = this.containerEl.appendChild(document.createElement('div'));
        this.playerEl.id = 'flash-player';
    }

    /**
     * Loads swf assets.
     *
     * @public
     * @return {void}
     */
    load() {
        this.setup();
        super.load();
        return this.loadAssets(JS).then(this.postLoad).catch(this.handleAssetError);
    }

    /**
     * Loads a swf object.
     *
     * @private
     * @return {void}
     */
    postLoad = () => {
        /* global swfobject */
        const template = this.options.representation.content.url_template;
        /* istanbul ignore next */
        swfobject.embedSWF(this.createContentUrlWithAuthParams(template), this.playerEl.id, '100%', '100%', '9', null, null, SWF_PARAMS, null, () => {
            if (this.isDestroyed()) {
                return;
            }
            this.loaded = true;
            this.emit('load');
        });
    }

    /**
     * Prefetches assets for swf.
     *
     * @param {boolean} [options.assets] - Whether or not to prefetch static assets
     * @return {void}
     */
    prefetch({ assets = true }) {
        if (assets) {
            this.prefetchAssets(JS);
        }
    }
}

export default SWF;
