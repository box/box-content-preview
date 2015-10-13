'use strict';

import '../../css/image/images.css';
import 'core-js/modules/es6.reflect';
import autobind from 'autobind-decorator';
import Promise from 'bluebird';
import ImageBase from './image-base';


const CSS_CLASS_IMAGE = 'box-preview-images';
const CSS_CLASS_IMAGE_WRAPPER = 'box-preview-images-wrapper';
const IMAGE_LOAD_TIMEOUT_IN_MILLIS = 20000;

let document = global.document;
let Box = global.Box || {};

@autobind
class Tiff extends ImageBase {

    /**
     * [constructor]
     * @param {string|HTMLElement} event The mousemove event
     * @param {object} [options] some options
     * @returns {Image}
     */
    constructor(container, options) {
        super(container, options);

        this.containerEl.appendChild(document.createElement('div'));
        this.containerEl.firstElementChild.className = CSS_CLASS_IMAGE;

        this.wrapperEl = this.containerEl.firstElementChild.appendChild(document.createElement('div'));
        this.wrapperEl.className = CSS_CLASS_IMAGE_WRAPPER;
        this.wrapperEl.addEventListener('mouseup', this.handleMouseUp);
        
        this.imageEls = [this.wrapperEl.appendChild(document.createElement('img'))];
    }

    /**
     * Loads an image.
     * @param {Array} imageUrls
     * @pubic
     * @returns {Promise}
     */
    load(imageUrls) {
        this.imageUrls = imageUrls;
        
        return new Promise((resolve, reject) => {

            this.imageEls[0].addEventListener('load', () => {
                resolve(this);
                this.loaded = true;
                this.zoom();

                if (this.options.ui !== false) {
                    this.loadUI();
                }

                this.emit('load');
            });

            this.imageUrls.forEach((imageUrl, index) => {
                if (index !== 0) {
                    this.imageEls[index] = this.wrapperEl.appendChild(document.createElement('img'));    
                }
                this.imageEls[index].src = imageUrl;
            });

            setTimeout(() => {
                if (!this.loaded) {
                    reject();
                }
            }, IMAGE_LOAD_TIMEOUT_IN_MILLIS);
        });
    }

    /**
     * Handles mouse up event.
     * @param {Event} event The mousemove event
     * @returns {void}
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
     * @param {string} [type] Type of zoom in|out|reset
     * @private
     * @returns {void}
     */
    zoom(type) {

        let newWidth,
            viewportWidth = this.wrapperEl.parentNode.clientWidth,
            imageContainerWidth = this.wrapperEl.clientWidth;

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

        this.wrapperEl.style.width = newWidth + 'px';
        
        // Fix the scroll position of the image to be centered
        this.wrapperEl.parentNode.scrollLeft = (this.wrapperEl.parentNode.scrollWidth - viewportWidth) / 2;

        this.emit('resize');
    }
}

Box.Preview = Box.Preview || {};
Box.Preview.Tiff = Tiff;
global.Box = Box;
export default Tiff;