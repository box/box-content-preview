'use strict';

import 'core-js/modules/es6.reflect';
import autobind from 'autobind-decorator';
import Promise from 'bluebird';


const CSS_CLASS_ZOOMABLE = 'zoomable';
const CSS_CLASS_PANNABLE = 'pannable';
const CSS_CLASS_PANNING = 'panning';
const IMAGE_LOAD_TIMEOUT_IN_MILLIS = 5000;


@autobind
class Image {

    /**
     * [constructor]
     * @param {Event} event The mousemove event
     * @returns {Promise}
     */
    constructor(imageUrl, containerElOrSelector) {
        this.imageUrl = imageUrl;
        this.document = global.document;

        if (typeof containerElOrSelector === 'string') {
            this.containerEl = this.document.querySelector(containerElOrSelector);
        } else {
            this.containerEl = containerElOrSelector;
        }        

        let ready = new Promise((resolve, reject) => {
            let imageEl = this.document.createElement('img');
            imageEl.onload = resolve;
            imageEl.src = imageUrl;
            this.imageEl = this.containerEl.appendChild(imageEl);

            setTimeout(() => {
                if (!ready.isFulfilled()) {
                    reject();
                }
            }, IMAGE_LOAD_TIMEOUT_IN_MILLIS);
        });

        ready.then(this.handleImageLoad);

        return ready;
    }


    /**
     * Handles mouse down event.
     * @param {Event} event The mousemove event
     * @returns {void}
     */
    handleMouseDown(event) {
        this.didPan = false;

        // If this is not a left click, then ignore
        // If this is a CTRL or CMD click, then ignore
        if ((typeof event.button !== 'number' || event.button < 2) && !event.ctrlKey && !event.metaKey) {
            this.startPanning(event.clientX, event.clientY);
            event.preventDefault();
        }
    }

    /**
     * Prevents drag events on the image
     * @param {Event} event The mousemove event
     * @returns {void}
     */
    handleDragStart(event) {
        event.preventDefault();
        event.stopPropogation();
    }


    /**
     * Event handler for preview image 'load' event
     * @private
     * @returns {void}
     */
    handleImageLoad() {
        this.updatePannability();
        this.imageEl.addEventListener('mousedown', this.handleMouseDown);
        this.imageEl.addEventListener('dragstart', this.handleDragStart);
    }

    /**
     * Updates cursors on image content
     * @private
     * @returns {void}
     */
    updateCursor() {
        if (this.isPannable) {
            this.isZoomable = false;
            this.imageEl.classList.add(CSS_CLASS_PANNABLE);
            this.imageEl.classList.remove(CSS_CLASS_ZOOMABLE);
        } else {
            this.isZoomable = true;
            this.imageEl.classList.remove(CSS_CLASS_PANNABLE);
            this.imageEl.classList.add(CSS_CLASS_ZOOMABLE);
        }
    }

    /**
     * Can the viewer currently be panned
     * @private
     * @returns {void}
     */
    updatePannability() {
        let imageDimensions = this.imageEl.getBoundingClientRect();
        let containerDimensions = this.containerEl.getBoundingClientRect();
        this.isPannable = imageDimensions.width > containerDimensions.width || imageDimensions.height > containerDimensions.height;
        this.didPan = false;
        this.updateCursor();
    }

    /**
     * Pan the image to the given x/y position
     * @param {Event} event The mousemove event
     * @private
     * @returns {void}
     */
    pan(event) {
        if (!this.isPanning) {
            return;
        }
        let offsetX = event.clientX - this.panStartX;
        let offsetY = event.clientY - this.panStartY;
        this.containerEl.scrollLeft = this.panStartScrollLeft - offsetX;
        this.containerEl.scrollTop = this.panStartScrollTop - offsetY;
        this.didPan = true;
    }

    /**
     * Stop panning the image
     * @private
     * @returns {void}
     */
    stopPanning() {
        this.isPanning = false;
        this.document.body.removeEventListener('mousemove', this.pan);
        this.document.body.removeEventListener('mouseup', this.stopPanning);
        this.imageEl.classList.remove(CSS_CLASS_PANNING);
    }

    /**
     * Start panning the image if the image is pannable
     * @param {number} x The initial x position of the mouse
     * @param {number} y The initial y position of the mouse
     * @returns {void}
     */
    startPanning(x, y) {
        if (!this.isPannable) {
            return;
        }
        this.panStartX = x;
        this.panStartY = y;
        this.panStartScrollLeft = this.containerEl.scrollLeft;
        this.panStartScrollTop = this.containerEl.scrollTop;
        this.isPanning = true;
        this.document.body.addEventListener('mousemove', this.pan);
        this.document.body.addEventListener('mouseup', this.stopPanning);
        this.imageEl.classList.add(CSS_CLASS_PANNING);
    }
}

global.Box = global.Box || {};
global.Box.Image = Image;
module.exports = Image;
