import VirtualScroller from './VirtualScroller';

const DEFAULT_THUMBNAILS_SIDEBAR_WIDTH = 150;
const THUMBNAIL_WIDTH_MAX = 210;

class ThumbnailsSidebar {
    constructor(element, pdfViewer) {
        this.anchorEl = element;
        this.pdfViewer = pdfViewer;
        this.thumbnailImageCache = {};
        this.workQueue = [];
        this.workInProgress = 0;
        this.processWorkQueue = true;
        this.maxQueueLength = 0;

        this.renderThumbnail = this.renderThumbnail.bind(this);
        this.requestThumbnailImage = this.requestThumbnailImage.bind(this);
        this.processNextWorkItem = this.processNextWorkItem.bind(this);
        this.makeThumbnailImage = this.makeThumbnailImage.bind(this);
        this.renderThumbnails = this.renderThumbnails.bind(this);
    }

    destroy() {
        if (this.virtualScroller) {
            this.virtualScroller.destroy();
        }

        this.thumbnailImageCache = null;
        this.virtualScroller = null;
        this.pdfViewer = null;
    }

    init() {
        this.virtualScroller = new VirtualScroller(this.anchorEl);

        // Get the first page of the document, and use its dimensions
        // to set the thumbnails size of the thumbnails sidebar
        this.pdfViewer.pdfDocument.getPage(1).then((page) => {
            const desiredWidth = DEFAULT_THUMBNAILS_SIDEBAR_WIDTH;
            const viewport = page.getViewport(1);
            this.scale = desiredWidth / viewport.width;
            this.pageRatio = viewport.width / viewport.height;
            const scaledViewport = page.getViewport(this.scale);

            this.maxQueueLength =
                (Math.floor(this.anchorEl.parentNode.clientHeight / (scaledViewport.height + 15)) + 1) * 3;

            this.virtualScroller.init({
                totalItems: this.pdfViewer.pagesCount,
                itemHeight: scaledViewport.height,
                containerHeight: this.anchorEl.parentNode.clientHeight,
                margin: 15,
                renderItemFn: (itemIndex) => this.renderThumbnail(itemIndex),
                onScrollEnd: (data) => {
                    console.log('scroll end', data);
                    this.processWorkQueue = true;
                    // this.processNextWorkItem();
                    this.renderThumbnails(data);
                },
                /* onScrollStart: (e) => {
                    console.log('scroll start', e);
                    this.processWorkQueue = false;
                }, */
                onInit: this.renderThumbnails
            });
        });
    }

    renderThumbnails(data) {
        data.items.forEach((thumbnail, index) => {
            if (thumbnail.classList.contains('bp-thumbnail-image-loaded')) {
                return;
            }

            this.requestThumbnailImage(index + data.startOffset, thumbnail);
        });
    }

    renderThumbnail(itemIndex) {
        const thumbnail = document.createElement('button');

        // this.requestThumbnailImage(itemIndex, thumbnail);
        // this.makeThumbnailImage(itemIndex)
        //     .then((dataUrl) => {
        //         this.thumbnailImageCache[itemIndex] = dataUrl;
        //         const image = document.createElement('img');
        //         image.src = dataUrl;
        //         image.style.maxWidth = '100%';
        //         thumbnail.appendChild(image);
        //     });

        thumbnail.className = 'bp-thumbnail';
        thumbnail.appendChild(this.createPageNumber(itemIndex + 1));
        return thumbnail;
    }

    requestThumbnailImage(itemIndex, thumbnail) {
        if (this.workInProgress < 5 && this.processWorkQueue) {
            requestAnimationFrame(() => {
                if (!this.anchorEl.contains(thumbnail)) {
                    console.log(`thumbnail element for index ${itemIndex} no longer present`);
                    this.workInProgress -= 1;
                    this.processNextWorkItem();
                    return;
                }

                this.makeThumbnailImage(itemIndex)
                    // .then((dataUrl) => {
                    //     this.workInProgress -= 1;
                    //     this.processNextWorkItem();

                    //     this.thumbnailImageCache[itemIndex] = dataUrl;

                    //     const image = document.createElement('img');
                    //     image.src = dataUrl;
                    //     image.style.maxWidth = '100%';
                    //     thumbnail.appendChild(image);
                    // });
                    .then((imageEl) => {
                        this.workInProgress -= 1;
                        this.processNextWorkItem();

                        this.thumbnailImageCache[itemIndex] = imageEl;
                        thumbnail.appendChild(imageEl);
                        thumbnail.classList.add('bp-thumbnail-image-loaded');
                    });
                this.workInProgress += 1;
            });
        } else {
            if (this.workQueue.length > this.maxQueueLength) {
                this.workQueue.shift();
            }

            this.workQueue.push({ itemIndex, thumbnail });
            console.log(`queuing thumbnail request ${itemIndex}`);
        }
    }

    processNextWorkItem() {
        if (this.workQueue.length && this.workInProgress < 5) {
            const nextWorkItem = this.workQueue.shift();
            console.log(`dequeuing thumbnail request ${nextWorkItem.itemIndex}`);
            this.requestThumbnailImage(nextWorkItem.itemIndex, nextWorkItem.thumbnail);
        }
    }

    makeThumbnailImage(itemIndex) {
        console.log(`making thumbnail for ${itemIndex}`);
        if (this.thumbnailImageCache[itemIndex]) {
            return Promise.resolve(this.thumbnailImageCache[itemIndex]);
        }

        const canvas = document.createElement('canvas');

        return (
            this.pdfViewer.pdfDocument
                .getPage(itemIndex + 1)
                // .then((page) => {
                //     const viewport = page.getViewport(1);
                //     const canvas = document.createElement('canvas');
                //     canvas.width = THUMBNAIL_WIDTH_MAX;
                //     canvas.height = THUMBNAIL_WIDTH_MAX / this.pageRatio;
                //     const scale = THUMBNAIL_WIDTH_MAX / viewport.width;
                //     return page.render({
                //         canvasContext: canvas.getContext('2d'),
                //         viewport: page.getViewport(scale)
                //     }).promise.then(() => canvas.toDataURL('image/jpeg'));
                // });
                .then((page) => {
                    const viewport = page.getViewport(1);
                    // const canvas = document.createElement('canvas');
                    canvas.width = THUMBNAIL_WIDTH_MAX;
                    canvas.height = THUMBNAIL_WIDTH_MAX / this.pageRatio;
                    const scale = THUMBNAIL_WIDTH_MAX / viewport.width;
                    return page.render({
                        canvasContext: canvas.getContext('2d'),
                        viewport: page.getViewport(scale)
                    });
                })
                .then(() => {
                    const image = document.createElement('img');
                    image.src = canvas.toDataURL();
                    image.style.maxWidth = '100%';
                    return image;
                })
        );
    }

    createPageNumber(pageNumber) {
        const pageNumberEl = document.createElement('div');
        pageNumberEl.className = 'bp-thumbnail-page-number';
        pageNumberEl.textContent = `${pageNumber}`;
        return pageNumberEl;
    }
}

export default ThumbnailsSidebar;
