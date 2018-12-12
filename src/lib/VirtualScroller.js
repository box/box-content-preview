class VirtualScroller {
    /**
     * [constructor]
     *
     * @param {HTMLElement} container - The HTMLElement that will contain the virtual scroller
     * @return {VirtualScroller} Instance of VirtualScroller
     */
    constructor(container) {
        this.container = container;

        this.previousScrollTop = 0;

        this.onScrollHandler = this.onScrollHandler.bind(this);
        this.renderItems = this.renderItems.bind(this);
    }

    /**
     * Destroys the virtual scroller
     *
     * @return {void}
     */
    destroy() {
        if (this.containerEl) {
            this.containerEl.remove();
        }

        this.containerEl = null;
        this.contentEl = null;
    }

    /**
     * Initializes the virtual scroller
     *
     * @param {Object} config - The config
     * @return {void}
     */
    init(config) {
        if (!config.totalItems || !config.itemHeight) {
            throw new Error('Need to provide totalItems and itemHeight');
        }

        // The total number items to be scrolled
        this.totalItems = config.totalItems;

        // The height of each individual item
        this.itemHeight = config.itemHeight;

        // The height of the visible container
        this.containerHeight = config.containerHeight;

        // The callback function that to allow users generate the item
        this.renderItemFn = config.renderItemFn;

        // Allows the user to specify the margin at the top of the container before the first item is rendered
        this.marginTop = config.marginTop || 0;

        // Allows the user to specify the margin at the bottom of the container after the last item is rendered
        this.marginBottom = config.marginBottom || 0;

        // The number of items that can fit in view
        this.totalViewItems = Math.ceil(this.containerHeight / this.itemHeight);

        // The height of the buffer before virtual scroll renders the next set
        this.maxBufferHeight = this.totalViewItems * this.itemHeight;

        // The max number of items to render at any one given time
        this.maxRenderedItems = Math.ceil(this.totalViewItems * 3);

        // Create the scrolling container element
        this.containerEl = document.createElement('div');
        this.containerEl.className = 'vs-container';

        // Create the true height content container
        this.contentEl = document.createElement('div');
        this.contentEl.className = 'vs-content-container';
        this.contentEl.style.height = `${this.totalItems * this.itemHeight + this.marginTop + this.marginBottom}px`;

        this.containerEl.appendChild(this.contentEl);
        this.container.appendChild(this.containerEl);

        this.renderItems();

        this.bindDOMListeners();
    }

    /**
     * Binds DOM listeners
     *
     * @return {void}
     */
    bindDOMListeners() {
        this.containerEl.addEventListener('scroll', this.onScrollHandler);
    }

    /**
     * Unbinds DOM listeners
     *
     * @return {void}
     */
    unbindDOMListeners() {
        if (this.containerEl) {
            this.containerEl.removeEventListener('scroll', this.onScrollHandler);
        }
    }

    /**
     * Handler for 'scroll' event
     *
     * @param {Event} e - The scroll event
     * @return {void}
     */
    onScrollHandler(e) {
        const { scrollTop } = e.target;

        if (Math.abs(scrollTop - this.previousScrollTop) > this.maxBufferHeight) {
            // The first item to be re-rendered will be a totalViewItems height up from the
            // item at the current location
            const firstIndex = Math.floor(scrollTop / this.itemHeight) - this.totalViewItems;
            this.renderItems(firstIndex < 0 ? 0 : firstIndex);

            this.previousScrollTop = scrollTop;
        }
    }

    /**
     * Render a set of items, starting from the offset index
     *
     * @param {number} offset  - The offset to start rendering items
     * @return {void}
     */
    renderItems(offset = 0) {
        let count = this.maxRenderedItems;
        // If the default count of items to render exceeds the totalItems count
        // then just render the difference
        if (count + offset > this.totalItems) {
            count = this.totalItems - offset;
        }

        let numItemsRendered = 0;
        const fragment = document.createDocumentFragment();

        while (numItemsRendered < count) {
            const rowEl = this.renderItem(offset + numItemsRendered, this.itemHeight);
            fragment.appendChild(rowEl);
            numItemsRendered += 1;
        }

        this.contentEl.innerHTML = '';
        this.contentEl.appendChild(fragment);
    }

    /**
     * Render a single item
     *
     * @param {*} rowIndex - The index of the item to be rendered
     * @return {HTMLElement} The newly created row item
     */
    renderItem(rowIndex) {
        const rowEl = document.createElement('div');
        const topPosition = this.itemHeight * rowIndex + this.marginTop;

        let renderedThumbnail;
        try {
            renderedThumbnail = this.renderItemFn.call(this, rowIndex);
        } catch (e) {
            console.error(e);
        }

        rowEl.style.top = `${topPosition}px`;
        rowEl.style.height = `${this.itemHeight}px`;
        rowEl.classList.add('vs-content-item');
        rowEl.dataset.item = rowIndex;

        if (renderedThumbnail) {
            rowEl.appendChild(renderedThumbnail);
        }

        return rowEl;
    }
}

export default VirtualScroller;
