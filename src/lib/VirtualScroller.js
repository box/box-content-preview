import isFinite from 'lodash/isFinite';
import isFunction from 'lodash/isFunction';
import throttle from 'lodash/throttle';
import debounce from 'lodash/debounce';

const BUFFERED_ITEM_MULTIPLIER = 3;
const THROTTLE_SCROLL_THRESHOLD = 150;
const DEBOUNCE_SCROLL_THRESHOLD = 151;

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

    /** @property {number} - The previously recorded scrollTop value */
    previousScrollTop;

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

        this.createListElement = this.createListElement.bind(this);
        this.onScrollEndHandler = this.onScrollEndHandler.bind(this);
        this.onScrollHandler = this.onScrollHandler.bind(this);
        this.getCurrentListInfo = this.getCurrentListInfo.bind(this);
        this.renderItems = this.renderItems.bind(this);

        this.debouncedOnScrollEndHandler = debounce(this.onScrollEndHandler, DEBOUNCE_SCROLL_THRESHOLD);
        this.throttledOnScrollHandler = throttle(this.onScrollHandler, THROTTLE_SCROLL_THRESHOLD);
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
        this.onScrollEnd = config.onScrollEnd;
        this.onScrollStart = config.onScrollStart;

        this.totalViewItems = Math.floor(this.containerHeight / (this.itemHeight + this.margin));
        this.maxBufferHeight = this.totalViewItems * this.itemHeight;
        this.maxRenderedItems = (this.totalViewItems + 1) * BUFFERED_ITEM_MULTIPLIER;

        // Create the scrolling container element
        this.scrollingEl = document.createElement('div');
        this.scrollingEl.className = 'bp-vs';

        // Create the true height content container
        this.listEl = this.createListElement();

        this.scrollingEl.appendChild(this.listEl);
        this.anchorEl.appendChild(this.scrollingEl);

        this.renderItems();

        this.bindDOMListeners();

        if (config.onInit) {
            const listInfo = this.getCurrentListInfo();
            config.onInit(listInfo);
        }
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
        this.scrollingEl.addEventListener('scroll', this.throttledOnScrollHandler, { passive: true });
        this.scrollingEl.addEventListener('scroll', this.debouncedOnScrollEndHandler, { passive: true });
    }

    /**
     * Unbinds DOM listeners
     *
     * @return {void}
     */
    unbindDOMListeners() {
        if (this.scrollingEl) {
            this.scrollingEl.removeEventListener('scroll', this.throttledOnScrollHandler);
            this.scrollingEl.removeEventListener('scroll', this.debouncedOnScrollEndHandler);
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
     * Debounced scroll handler to signal when scrolling has stopped
     *
     * @return {void}
     */
    onScrollEndHandler() {
        if (this.onScrollEnd) {
            const listInfo = this.getCurrentListInfo();
            this.onScrollEnd(listInfo);
        }
    }

    /**
     * Gets information about what the current start offset, end offset and rendered items array
     *
     * @return {Object} - info object
     */
    getCurrentListInfo() {
        const { firstElementChild, lastElementChild, children } = this.listEl;

        // Parse the row index from the data-attribute
        let curStartOffset = firstElementChild ? parseInt(firstElementChild.dataset.bpVsRowIndex, 10) : -1;
        let curEndOffset = lastElementChild ? parseInt(lastElementChild.dataset.bpVsRowIndex, 10) : -1;

        // If the data-attribute value is not present default to invalid -1
        curStartOffset = isFinite(curStartOffset) ? curStartOffset : -1;
        curEndOffset = isFinite(curEndOffset) ? curEndOffset : -1;

        let items = [];

        if (children) {
            // Extract an array of the user's created HTMLElements
            items = Array.prototype.slice
                .call(children)
                .map((listItemEl) => (listItemEl && listItemEl.children ? listItemEl.children[0] : null));
        }

        return {
            startOffset: curStartOffset,
            endOffset: curEndOffset,
            items
        };
    }

    /**
     * Render a set of items, starting from the offset index
     *
     * @param {number} offset  - The offset to start rendering items
     * @return {void}
     */
    renderItems(offset = 0) {
        // calculate the diff between what is already rendered
        // and what needs to be rendered
        const { startOffset: curStartOffset, endOffset: curEndOffset } = this.getCurrentListInfo();

        if (curStartOffset === offset) {
            return;
        }

        let newStartOffset = offset;
        let newEndOffset = offset + this.maxRenderedItems;
        // If the default count of items to render exceeds the totalItems count
        // then just render up to the end
        if (newEndOffset >= this.totalItems) {
            newEndOffset = this.totalItems - 1;
        }

        // Create a new list element to be swapped out for the existing one
        const newListEl = document.createDocumentFragment();

        if (curStartOffset <= offset && offset <= curEndOffset) {
            // Scenario #1: New start offset falls within the current range of items rendered
            //      |--------------------|
            //  curStartOffset       curEndOffset
            //          |--------------------|
            //   newStartOffset          newEndOffset
            newStartOffset = curEndOffset + 1;
            // Create elements from curEnd + 1 to newEndOffset
            this.createItems(newListEl, newStartOffset, newEndOffset);
            // Delete the elements from curStartOffset to newStartOffset
            this.deleteItems(this.listEl, curStartOffset - curStartOffset, offset - curStartOffset);
            // Append the document fragment to the listEl
            this.listEl.appendChild(newListEl);
        } else if (curStartOffset <= newEndOffset && newEndOffset <= curEndOffset) {
            // Scenario #2: New end offset falls within the current range of items rendered
            //                |--------------------|
            //          curStartOffset        curEndOffset
            //          |--------------------|
            //    newStartOffset        newEndOffset

            // Create elements from newStartOffset to curStart - 1
            this.createItems(newListEl, offset, curStartOffset - 1);
            // Delete the elements from newEndOffset to the end
            this.deleteItems(this.listEl, newEndOffset - curStartOffset + 1);
            // Insert before the firstElementChild of the listEl
            this.listEl.insertBefore(newListEl, this.listEl.firstElementChild);
        } else {
            // Scenario #3: New range has no overlap with current range of items
            //                          |--------------------|
            //                    curStartOffset        curEndOffset
            //  |--------------------|
            // newStartOffset    newEndOffset
            this.createItems(newListEl, newStartOffset, newEndOffset);
            this.listEl.appendChild(newListEl);
        }
    }

    /**
     * Creates new HTMLElements appended to the newList
     *
     * @param {HTMLElement} newListEl - the new `ol` element
     * @param {number} start - start index
     * @param {number} end  - end index
     * @return {void}
     */
    createItems(newListEl, start, end) {
        if (!newListEl || start < 0 || end < 0) {
            return;
        }

        for (let i = start; i <= end; i++) {
            const newEl = this.renderItem(i);
            newListEl.appendChild(newEl);
        }
    }

    /**
     * Deletes elements of the 'ol'
     *
     * @param {HTMLElement} listEl - the `ol` element
     * @param {number} start - start index
     * @param {number} [end] - end index
     * @return {void}
     */
    deleteItems(listEl, start, end) {
        if (!listEl || start < 0 || end < 0) {
            return;
        }

        const listItems = Array.prototype.slice.call(listEl.children, start, end);
        listItems.forEach((listItem) => listEl.removeChild(listItem));
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
        rowEl.dataset.bpVsRowIndex = rowIndex;

        if (renderedThumbnail) {
            rowEl.appendChild(renderedThumbnail);
        }

        return rowEl;
    }

    /**
     * Utility to create the list element
     *
     * @return {HTMLElement} The list element
     */
    createListElement() {
        const newListEl = document.createElement('ol');
        newListEl.className = 'bp-vs-list';
        newListEl.style.height = `${this.totalItems * (this.itemHeight + this.margin) + this.margin}px`;
        return newListEl;
    }
}

export default VirtualScroller;
