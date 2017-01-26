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

class SWF extends Base {
    /**
     * @inheritdoc
     */
    setup() {
        // Always call super 1st to have the common layout
        super.setup();

        this.playerEl = this.containerEl.appendChild(document.createElement('div'));
        this.playerEl.id = 'flash-player';
    }

    /**
     * Loads a swf object.
     *
     * @public
     * @return {void}
     */
    load() {
        /* global swfobject */
        this.setup();

        const { representation } = this.options;
        const { data, status } = representation;
        const { content } = data;
        const { url_template: template } = content;

        Promise.all(this.loadAssets(['third-party/swf/swfobject.js']), status.getPromise()).then(() => {
            swfobject.embedSWF(this.createContentUrlWithAuthParams(template), this.playerEl.id, '100%', '100%', '9', null, null, SWF_PARAMS, null, () => {
                if (this.isDestroyed()) {
                    return;
                }
                this.loaded = true;
                this.emit('load');
            });
        });
        super.load();
    }

    /**
     * Prefetches assets for swf.
     *
     * @return {void}
     */
    prefetch() {
        this.prefetchAssets(['third-party/swf/swfobject.js']);
    }

    /**
     * Returns the name of the viewer
     *
     * @override
     * @returns {string} swf
     */
    getName() {
        return 'SWF';
    }
}

export default SWF;
