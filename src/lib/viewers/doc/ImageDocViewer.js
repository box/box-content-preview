import BaseViewer from '../BaseViewer';
import ImagePageLoader from './ImagePageLoader';
import ImageDocRenderer from './ImageDocRenderer';

import './ImageDocViewer.scss';

class ImageDocViewer extends BaseViewer {
    constructor(options) {
        super(options);
        this.finishLoading = this.finishLoading.bind(this);
    }

    /**
     * @inheritdoc
     */
    setup() {
        this.fileLoadingIcon = this.fileLoadingIcon;

        // Call super() to set up common layout
        super.setup();

        this.docEl = this.containerEl.appendChild(document.createElement('div'));
        this.docEl.classList.add('bp-doc');
        this.docEl.classList.add('bp-doc-simple-document');

        this.pageWrapperEl = this.docEl.appendChild(document.createElement('div'));
        this.pageLoader = new ImagePageLoader(this.options);
    }

    /**
     * [destructor]
     *
     * @return {void}
     */
    destroy() {
        this.docEl = null;
        super.destroy();
    }

    /**
     * @inheritdoc
     */
    load() {
        this.setup();
        super.load();

        this.pageLoader
            .getRepresentation(this.containerEl.clientHeight, this.containerEl.clientWidth)
            .then((representation) => {
                this.docRenderer = new ImageDocRenderer(
                    this.docEl,
                    representation.metadata.pages,
                    representation,
                    this.options.viewer.ASSET,
                    this.createContentUrlWithAuthParams
                );

                this.docRenderer.addListener('load', this.finishLoading);
                this.docRenderer.renderDoc();
            })
            .catch((e) => {
                /* eslint-disable no-console */
                console.error(e);
                /* eslint-enable no-console */
            });
    }

    /**
     * Finishes loading content
     *
     * @private
     * @emits load
     * @return {void}
     */
    finishLoading() {
        this.loaded = true;
        this.emit('load');
    }

    /**
     * Resize handler
     *
     * @private
     * @return {Function} debounced resize handler
     */
    resize() {
        this.docRenderer.resize();
    }
}

export default ImageDocViewer;
