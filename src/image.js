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
        this.currentRotationAngle = 0;

        if (typeof containerElOrSelector === 'string') {
            this.containerEl = this.document.querySelector(containerElOrSelector);
        } else {
            this.containerEl = containerElOrSelector;
        }        

        let ready = new Promise((resolve, reject) => {
            let imageEl = this.document.createElement('img');
            imageEl.addEventListener('load', () => {
                resolve(this);
            });
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
        this.zoom();
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

    /**
     * Rotate image anti-clockwise by 90 degrees
     * @private
     * @returns {void}
     */
    rotateLeft() {
        let angle = this.currentRotationAngle - 90;
        this.currentRotationAngle = (angle === -3600) ? 0 : angle;
        this.imageEl.style.transform = 'rotate(' + this.currentRotationAngle + 'deg)';
    }

    /**
     * Handles zoom
     * @param {string} [type] Type of zoom in|out|fit
     * @private
     * @returns {void}
     */
    zoom(type) {

        let temp,
            ratio = 1, // default scaling ratio is 1:1
            newWidth,
            newHeight,
            newMarginLeft,
            newMarginTop,
            viewport,
            widthDifference,
            heightDifference,
            overflowingWidth,
            overflowingHeight,
            modifyWidthInsteadOfHeight,
            isRotated = Math.abs(this.currentRotationAngle) % 180 === 90,
            imageCurrentDimensions = this.imageEl.getBoundingClientRect(), // Getting bounding rect does not ignore transforms / rotates
            wrapperCurrentDimensions = this.containerEl.getBoundingClientRect(),
            width = imageCurrentDimensions.width,
            height = imageCurrentDimensions.height,
            aspect = width / height;

        // For multi page tifs, we always modify the width, since its essentially a DIV and not IMG tag.
        // For images that are wider than taller we use width. For images that are taller than wider, we use height.
        modifyWidthInsteadOfHeight = aspect >= 1;

        // getBoundingClientRect() includes scrollbar widths.
        viewport = {
            width: wrapperCurrentDimensions.width,
            height: wrapperCurrentDimensions.height
        };


        // From this point on, only 1 dimension will be modified. Either it will be width or it will be height.
        // The other one will remain null and eventually get cleared out. The image should automatically use the proper value
        // for the dimension that was cleared out.

        switch (type) {

            case 'in':
                if (modifyWidthInsteadOfHeight) {
                    newWidth = width + 100;
                } else {
                    newHeight = height + 100;
                }
                break;

            case 'out':
                if (modifyWidthInsteadOfHeight) {
                    newWidth = width - 100;
                } else {
                    newHeight = height - 100;
                }
                break;

            case 'reset':
                // Reset the dimensions to their original values by removing overrides
                // Doing so will make the browser render the image in its natural size
                // Then we can proceed by recalculating stuff from that natural size.
                this.imageEl.style.width = '';
                this.imageEl.style.height = '';

                // Image may still overflow the page, so do the default zoom by calling zoom again
                // This will go through the same workflow but end up in another case block.
                zoom();

                // Kill further execution
                return;

            default:

                // If the image is overflowing the viewport, figure out by how much
                // Then take that aspect that reduces the image the maximum (hence min ratio) to fit both width and height
                if (width > viewport.width || height > viewport.height) {
                    ratio = Math.min(viewport.width / width, viewport.height / height);
                }

                if (modifyWidthInsteadOfHeight) {
                    newWidth = width * ratio;
                } else {
                    newHeight = height * ratio;
                }
        }

        // If the image has been rotated, we need to swap the width and height
        // getBoundingClientRect always gives values based on how its rendered on the screen
        // But when setting width or height, transforms / rotates are ignored.
        if (isRotated) {
            temp = newWidth;
            newWidth = newHeight;
            newHeight = temp;
        }

        // Set the new dimensions. This ignores rotates, hence we need to swap the dimensions above.
        // Only one of the below will be set, while the other will get cleared out to let the browser
        // adjust it automatically based on the images aspect ratio.
        this.imageEl.style.width = newWidth ? newWidth + 'px' : '';
        this.imageEl.style.height = newHeight ? newHeight + 'px' : '';

        // Fix the scroll position of the image to be centered
        this.containerEl.scrollLeft = (this.containerEl.scrollWidth - viewport.width) / 2;
        this.containerEl.scrollTop = (this.containerEl.scrollHeight - viewport.height) / 2;

        // Give the browser some time to render before updating pannability
        setTimeout(this.updatePannability, 50);
    }

        
}

global.Box = global.Box || {};
global.Box.Image = Image;
module.exports = Image;
