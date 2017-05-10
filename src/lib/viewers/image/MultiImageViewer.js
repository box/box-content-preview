import autobind from 'autobind-decorator';
import ImageBaseViewer from './ImageBaseViewer';
import './MultiImage.scss';

import { ICON_FULLSCREEN_IN, ICON_FULLSCREEN_OUT } from '../../icons/icons';
import { CLASS_INVISIBLE, CLASS_BOX_ANNOTATED_ELEMENT } from '../../constants';

const PADDING_BUFFER = 100;
const CSS_CLASS_IMAGE = 'bp-images';
const CSS_CLASS_IMAGE_WRAPPER = 'bp-images-wrapper';
const ZOOM_UPDATE_PAN_DELAY = 50;

@autobind
class MultiImageViewer extends ImageBaseViewer {

    /**
     * @inheritdoc
     */
    setup() {
        super.setup();

        this.wrapperEl = this.containerEl.appendChild(document.createElement('div'));
        this.wrapperEl.classList.add(CSS_CLASS_IMAGE_WRAPPER);
        this.wrapperEl.classList.add(CLASS_BOX_ANNOTATED_ELEMENT);

        this.imageEl = this.wrapperEl.appendChild(document.createElement('div'));
        this.imageEl.classList.add(CSS_CLASS_IMAGE);

        this.singleImageEls = [this.imageEl.appendChild(document.createElement('img'))];
        this.loadTimeout = 60000;
    }

    /**
     * [destructor]
     *
     * @return {void}
     */
    destroy() {
        // Remove listeners
        this.unbindDOMListeners();

        if (this.singleImageEls && this.singleImageEls.length > 0) {
            this.singleImageEls.forEach((el, index) => {
                this.unbindImageListeners(index);
            });
        }

        super.destroy();
    }

    /**
     * Loads the images.
     *
     * @param {Array} imageUrls - Urls for images
     * @return {Promise} Promise to load bunch of images
     */
    load() {
        this.setup();
        super.load();

        // Hides images until content is loaded
        this.imageEl.classList.add(CLASS_INVISIBLE);
        this.bindImageListeners(0);
        this.bindDOMListeners();

        return this.getRepStatus().getPromise().then(() => {
            const template = this.options.representation.content.url_template;
            this.imageUrls = this.constructImageUrls(template);

            this.imageUrls.forEach((imageUrl, index) => this.setupImageEls(imageUrl, index));
        }).catch(this.handleAssetError);
    }

    /**
     * Generates a list of image urls from the given template.
     *
     * @param {string} template - Base URL for images
     * @return {string[]} Array of image URLs
     */
    constructImageUrls(template) {
        const { viewer, representation } = this.options;
        const metadata = representation.metadata;
        const asset = viewer.ASSET;

        const urlBase = this.createContentUrlWithAuthParams(template, asset);

        const urls = [];
        for (let pageNum = 1; pageNum <= metadata.pages; pageNum++) {
            urls.push(urlBase.replace('{page}', pageNum));
        }

        return urls;
    }

    /**
     * Sets up each image El.
     *
     * @param {Object} imageUrl - Image URL.
     * @param {number} index - Index in the image URL array.
     * @return {void}
     */
    setupImageEls(imageUrl, index) {
        // first page is created in setup(), so we don't need create it here
        if (index !== 0) {
            this.singleImageEls[index] = this.imageEl.appendChild(document.createElement('img'));
            this.bindImageListeners(index);
        }

        // Set page number. Page is index + 1.
        this.singleImageEls[index].setAttribute('data-page-number', index + 1);

        this.singleImageEls[index].src = imageUrl;
    }

    /**
     * Updates pannability state and cursor.
     *
     * @private
     * @return {void}
     */
    updatePannability() {
        if (!this.wrapperEl) {
            return;
        }

        this.isPannable = this.imageEl.clientWidth > this.wrapperEl.clientWidth;
        this.didPan = false;
        this.updateCursor();
    }

    /**
     * Handles zoom
     * @param {string} [type] - Type of zoom in|out|reset
     * @private
     * @return {void}
     */
    zoom(type) {
        let newWidth;
        const viewportWidth = this.imageEl.parentNode.clientWidth;
        const imageContainerWidth = this.imageEl.clientWidth;

        switch (type) {
            case 'in':
                newWidth = imageContainerWidth + PADDING_BUFFER;
                break;

            case 'out':
                newWidth = imageContainerWidth - PADDING_BUFFER;
                break;

            default:
                newWidth = viewportWidth;
                break;
        }

        this.imageEl.style.width = `${newWidth}px`;

        // Fix the scroll position of the image to be centered
        this.imageEl.parentNode.scrollLeft = (this.imageEl.parentNode.scrollWidth - viewportWidth) / 2;

        if (this.annotator) {
            this.scaleAnnotations(this.imageEl.offsetWidth, this.imageEl.offsetHeight);
        }

        this.emit('zoom');

        // Give the browser some time to render before updating pannability
        setTimeout(this.updatePannability, ZOOM_UPDATE_PAN_DELAY);
    }

    /**
     * @inheritdoc
     */
    scaleAnnotations(width, height) {
        // Grab the first page image dimensions
        const imageEl = this.singleImageEls[0];
        const scale = width ? (width / imageEl.naturalWidth) : (height / imageEl.naturalHeight);
        this.annotator.setScale(scale);
        this.annotator.renderAnnotations();
    }

    /**
     * Adds UI controls
     *
     * @override
     * @return {void}
     */
    loadUI() {
        super.loadUI();
        this.controls.add(__('enter_fullscreen'), this.toggleFullscreen, 'bp-enter-fullscreen-icon', ICON_FULLSCREEN_IN);
        this.controls.add(__('exit_fullscreen'), this.toggleFullscreen, 'bp-exit-fullscreen-icon', ICON_FULLSCREEN_OUT);
    }

    /**
     * Binds error and load event listeners for an image element.
     *
     * @protected
     * @return {void}
     */
    bindImageListeners(index) {
        if (index === 0) {
            this.singleImageEls[index].addEventListener('load', this.finishLoading);
        }

        this.singleImageEls[index].addEventListener('error', this.errorHandler);
    }

    /**
     * Unbinds error and load event listeners for an image element.
     *
     * @protected
     * @return {void}
     */
    unbindImageListeners(index) {
        if (index === 0) {
            this.singleImageEls[index].removeEventListener('load', this.finishLoading);
        }

        this.singleImageEls[index].removeEventListener('error', this.errorHandler);
    }
}

export default MultiImageViewer;
