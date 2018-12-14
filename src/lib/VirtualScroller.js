import isFinite from 'lodash/isFinite';
import isFunction from 'lodash/isFunction';

const BUFFERED_ITEM_MULTIPLIER = 3;

class VirtualScroller {
    /** @property {HTMLElement} - The anchor element for this Virtual Scroller */
    anchorEl;

    /** @property {HTMLElement} - The reference to the scrolling element container */
    scrollingEl;

    /** @property {number} - The height of the scrolling container */
    containerHeight;

    /** @property {number} - The height of a single list item */
    itemHeight;

    /** @property {HTMLElement} - The reference to the list element */
    listEl;

    /** @property {number} - The margin at the top of the list and below every list item */
    margin;

    /** @property {number} -  The height of the buffer before virtual scroll renders the next set */
    maxBufferHeight;

    /** @property {number} - The max number of items to render at any one given time */
    maxRenderedItems;

    /** @property {Function} - The callback function that to allow users generate the item */
    renderItemFn;

    /** @property {number} - The total number items to be scrolled */
    totalItems;

    /** @property {number} - The number of items that can fit in the visible scrolling element */
    totalViewItems;

    /**
     * [constructor]
     *
     * @param {HTMLElement} anchor - The HTMLElement that will anchor the virtual scroller
     * @return {VirtualScroller} Instance of VirtualScroller
     */
    constructor(anchor) {
        this.anchorEl = anchor;

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
        if (this.scrollingEl) {
            this.scrollingEl.remove();
        }

        this.scrollingEl = null;
        this.listEl = null;
    }

    /**
     * Initializes the virtual scroller
     *
     * @param {Object} config - The config
     * @return {void}
     */
    init(config) {
        this.validateRequiredConfig(config);

        this.totalItems = config.totalItems;
        this.itemHeight = config.itemHeight;
        this.containerHeight = config.containerHeight;
        this.renderItemFn = config.renderItemFn;
        this.margin = config.margin || 0;
        this.totalViewItems = Math.ceil(this.containerHeight / (this.itemHeight + this.margin));
        this.maxBufferHeight = this.totalViewItems * this.itemHeight;
        this.maxRenderedItems = this.totalViewItems * BUFFERED_ITEM_MULTIPLIER;

        // Create the scrolling container element
        this.scrollingEl = document.createElement('div');
        this.scrollingEl.className = 'bp-vs';

        // Create the true height content container
        this.listEl = document.createElement('ol');
        this.listEl.className = 'bp-vs-list';
        this.listEl.style.height = `${this.totalItems * (this.itemHeight + this.margin) + this.margin}px`;

        this.scrollingEl.appendChild(this.listEl);
        this.anchorEl.appendChild(this.scrollingEl);

        this.renderItems();

        this.bindDOMListeners();
    }

    /**
     * Utility function to validate the required config is present
     *
     * @param {Object} config - the config object
     * @return {void}
     * @throws Error
     */
    validateRequiredConfig(config) {
        if (!config.totalItems || !isFinite(config.totalItems)) {
            throw new Error('totalItems is required');
        }

        if (!config.itemHeight || !isFinite(config.itemHeight)) {
            throw new Error('itemHeight is required');
        }

        if (!config.renderItemFn || !isFunction(config.renderItemFn)) {
            throw new Error('renderItemFn is required');
        }

        if (!config.containerHeight || !isFinite(config.containerHeight)) {
            throw new Error('containerHeight is required');
        }
    }

    /**
     * Binds DOM listeners
     *
     * @return {void}
     */
    bindDOMListeners() {
        this.scrollingEl.addEventListener('scroll', this.onScrollHandler);
    }

    /**
     * Unbinds DOM listeners
     *
     * @return {void}
     */
    unbindDOMListeners() {
        if (this.scrollingEl) {
            this.scrollingEl.removeEventListener('scroll', this.onScrollHandler);
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
            const firstIndex = Math.floor(scrollTop / (this.itemHeight + this.margin)) - this.totalViewItems;
            this.renderItems(Math.max(firstIndex, 0));

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
            const rowEl = this.renderItem(offset + numItemsRendered);
            fragment.appendChild(rowEl);
            numItemsRendered += 1;
        }

        while (this.listEl.firstChild) {
            this.listEl.removeChild(this.listEl.firstChild);
        }

        this.listEl.appendChild(fragment);
    }

    /**
     * Render a single item
     *
     * @param {number} rowIndex - The index of the item to be rendered
     * @return {HTMLElement} The newly created row item
     */
    renderItem(rowIndex) {
        const rowEl = document.createElement('li');
        const topPosition = (this.itemHeight + this.margin) * rowIndex + this.margin;

        let renderedThumbnail;
        try {
            renderedThumbnail = this.renderItemFn.call(this, rowIndex);
        } catch (err) {
            // eslint-disable-next-line
            console.error(`Error rendering thumbnail - ${err}`);
        }

        rowEl.style.top = `${topPosition}px`;
        rowEl.style.height = `${this.itemHeight}px`;
        rowEl.classList.add('bp-vs-list-item');

        if (renderedThumbnail) {
            rowEl.appendChild(renderedThumbnail);
        }

        return rowEl;
    }
}

export default VirtualScroller;
