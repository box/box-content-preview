import autobind from 'autobind-decorator';
import ImageBase from './image-base';
import {
    ICON_FULLSCREEN_IN,
    ICON_FULLSCREEN_OUT
} from '../../icons/icons';
import './multi-image.scss';

const CSS_CLASS_IMAGE = 'bp-images';
const CSS_CLASS_IMAGE_WRAPPER = 'bp-images-wrapper';

const Box = global.Box || {};

@autobind
class MultiImage extends ImageBase {

    /**
     * [constructor]
     *
     * @param {string|HTMLElement} container - The container
     * @param {Object} options - some options
     * @return {MultiImage} MultiImage instance
     */
    constructor(container, options) {
        super(container, options);

        this.containerEl.appendChild(document.createElement('div'));
        this.containerEl.firstElementChild.className = CSS_CLASS_IMAGE;

        this.wrapperEl = this.containerEl.firstElementChild.appendChild(document.createElement('div'));
        this.wrapperEl.className = CSS_CLASS_IMAGE_WRAPPER;
        this.wrapperEl.addEventListener('mouseup', this.handleMouseUp);

        this.imageEls = [this.wrapperEl.appendChild(document.createElement('img'))];
        this.loadTimeout = 60000;
    }

    /**
     * [destructor]
     * @return {void}
     */
    destroy() {
        // Remove listeners
        if (this.wrapperEl) {
            this.wrapperEl.removeEventListener('mouseup', this.handleMouseUp);
        }

        super.destroy();
    }

    /**
     * Loads an image.
     *
     * @pubic
     * @param {Array} imageUrls urls for images
     * @returns {Promise} Promise to load bunch of images
     */
    load(imageUrlsTemplate) {
        this.imageUrls = imageUrlsTemplate;

        this.imageEls[0].addEventListener('load', () => {
            if (this.destroyed) {
                return;
            }
            this.loaded = true;
            this.emit('load');
            this.zoom();
            this.loadUI();
        });

        this.imageUrls.forEach((imageUrl, index) => {
            if (index !== 0) {
                this.imageEls[index] = this.wrapperEl.appendChild(document.createElement('img'));
            }
            this.imageEls[index].src = imageUrl;
        });

        super.load();
    }

    /**
     * Handles mouse up event.
     * @param {Event} event - The mousemove event
     * @return {void}
     */
    handleMouseUp(event) {
        // If this is not a left click, then ignore
        // If this is a CTRL or CMD click, then ignore
        if ((typeof event.button !== 'number' || event.button < 2) && !event.ctrlKey && !event.metaKey) {
            this.zoom('in');
            event.preventDefault();
        }
    }

    /**
     * Handles zoom
     * @param {string} [type] - Type of zoom in|out|reset
     * @private
     * @return {void}
     */
    zoom(type) {
        let newWidth;
        const viewportWidth = this.wrapperEl.parentNode.clientWidth;
        const imageContainerWidth = this.wrapperEl.clientWidth;

        switch (type) {
            case 'in':
                newWidth = imageContainerWidth + 100;
                break;

            case 'out':
                newWidth = imageContainerWidth - 100;
                break;

            default:
                newWidth = viewportWidth;
                break;
        }

        this.wrapperEl.style.width = `${newWidth}px`;

        // Fix the scroll position of the image to be centered
        this.wrapperEl.parentNode.scrollLeft = (this.wrapperEl.parentNode.scrollWidth - viewportWidth) / 2;

        this.emit('resize');
    }

    /**
     * Loads controls
     *
     * @private
     * @return {void}
     */
    loadUI() {
        super.loadUI();
        this.controls.add(__('enter_fullscreen'), this.toggleFullscreen, 'bp-enter-fullscreen-icon', ICON_FULLSCREEN_IN);
        this.controls.add(__('exit_fullscreen'), this.toggleFullscreen, 'bp-exit-fullscreen-icon', ICON_FULLSCREEN_OUT);
    }
}

Box.Preview = Box.Preview || {};
Box.Preview.MultiImage = MultiImage;
global.Box = Box;
export default MultiImage;
