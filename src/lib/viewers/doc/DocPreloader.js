import {
    CLASS_BOX_PREVIEW_PRELOAD,
    CLASS_BOX_PREVIEW_PRELOAD_CONTENT,
    CLASS_BOX_PREVIEW_PRELOAD_WRAPPER,
    CLASS_INVISIBLE
} from '../../constants';
import { hideLoadingIndicator } from '../../ui';

class DocPreloader {

    /**
     * Shows a preload of the document by showing the first page as an image. This should be called
     * while the full document loads to give the user visual feedback on the file as soon as possible.
     *
     * @param {string} contentUrlWithAuth - URL for preload content with authorization query params
     * @param {HTMLElement} containerEl - Viewer container to render preload in
     * @return {void}
     */
    showPreload(contentUrlWithAuth, containerEl) {
        const wrapperEl = document.createElement('div');
        wrapperEl.className = CLASS_BOX_PREVIEW_PRELOAD_WRAPPER;
        wrapperEl.innerHTML = `
            <div class="${CLASS_BOX_PREVIEW_PRELOAD} ${CLASS_INVISIBLE}">
                <img class="${CLASS_BOX_PREVIEW_PRELOAD_CONTENT}" src="${contentUrlWithAuth}" />
                <div class="${CLASS_BOX_PREVIEW_PRELOAD_CONTENT}"></div>
            </div>
        `.trim();

        containerEl.appendChild(wrapperEl);

        // Offset scrollbar width (if scrollbar shows up)
        this.preloadEl = wrapperEl.querySelector(`.${CLASS_BOX_PREVIEW_PRELOAD}`);
        this.preloadEl.style.overflow = 'scroll';
        this.preloadEl.style.right = `${this.preloadEl.offsetWidth - this.preloadEl.clientWidth}px`;
        this.preloadEl.style.overflow = 'auto';

        // Resize preload representation after it loads to be as close as possible to
        // true document size. Scale algorithm is adapted from _setScale() in pdf_viewer.js
        const imageEl = this.preloadEl.querySelector(`img.${CLASS_BOX_PREVIEW_PRELOAD_CONTENT}`);
        imageEl.addEventListener('load', this.finishPreload);
    }

    /**
     * Hides the preload if it exists.
     *
     * @param {HTMLElement} containerEl - Viewer container that preload is rendered in
     * @return {void}
     */
    hidePreload(containerEl) {
        let wrapperEl = containerEl.querySelector(`.${CLASS_BOX_PREVIEW_PRELOAD_WRAPPER}`);
        if (!wrapperEl) {
            return;
        }

        wrapperEl.classList.add(CLASS_INVISIBLE);

        // Remove wrapper after animation has finished
        wrapperEl.addEventListener('transitionend', (event) => {
            if (event.propertyName === 'opacity') {
                if (wrapperEl.parentNode) {
                    wrapperEl.parentNode.removeChild(wrapperEl);
                }

                wrapperEl = undefined;
            }
        });
    }

    /**
     * Finish preloading by properly sizing preload content and hiding normal
     * loading indicator.
     *
     * @private
     * @return {void}
     */
    finishPreload = () => {
        if (!this.preloadEl) {
            return;
        }

        const imageEl = this.preloadEl.querySelector(`img.${CLASS_BOX_PREVIEW_PRELOAD_CONTENT}`);
        const placeholderEl = this.preloadEl.querySelector(`div.${CLASS_BOX_PREVIEW_PRELOAD_CONTENT}`);

        const { naturalHeight: imgHeight, naturalWidth: imgWidth } = imageEl;
        const { clientHeight, clientWidth } = this.preloadEl;
        const heightScale = (clientHeight - 5) / imgHeight;
        const widthScale = (clientWidth - 40) / imgWidth;
        let scale = 1;

        // pdf.js scales a standard PowerPoint pptx (as PDF) to 1045x588. 1045/1024 ~ 1.02
        const MAX_LANDSCAPE_SCALE = 1.02;
        const MAX_LANDSCAPE_WIDTH = 1045;

        // pdf.js scales a standard Word docx to 1019x1319. 1319/1024 ~ 1.288
        const MAX_PORTRAIT_SCALE = 1.288;
        const MAX_PORTRAIT_WIDTH = 1019;

        // @NOTE(tjin): This scale isn't guaranteed to scale the image to the same size pdf.js will
        // eventually auto-size to since at this point, we don't have the true PDF size.
        const isLandscape = imgWidth > imgHeight;
        if (isLandscape) {
            scale = Math.min(heightScale, widthScale);
            scale = Math.min(MAX_LANDSCAPE_SCALE, scale);
        } else {
            scale = widthScale;
            scale = Math.min(MAX_PORTRAIT_SCALE, scale);
        }

        // Set maximum width to MAX_LANDSCAPE|PORTRAIT_WIDTH
        const tempWidth = scale * imgWidth;
        if (isLandscape && tempWidth > MAX_LANDSCAPE_WIDTH) {
            scale = MAX_LANDSCAPE_WIDTH / imgWidth;
        } else if (tempWidth > MAX_PORTRAIT_WIDTH) {
            scale = MAX_PORTRAIT_WIDTH / imgWidth;
        }

        const scaledHeight = Math.floor(scale * imgHeight);
        const scaledWidth = Math.floor(scale * imgWidth);

        // Set image and placeholder height
        imageEl.style.height = `${scaledHeight}px`;
        imageEl.style.width = `${scaledWidth}px`;
        placeholderEl.style.height = `${scaledHeight}px`;
        placeholderEl.style.width = `${scaledWidth}px`;

        // Hide the preview-level loading indicator
        hideLoadingIndicator();

        // Show preload element after content is properly sized
        this.preloadEl.classList.remove(CLASS_INVISIBLE);
    }
}

export default new DocPreloader();
