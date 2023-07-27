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
        this.isVisible = this.isVisible.bind(this);
        this.onScrollEndHandler = this.onScrollEndHandler.bind(this);
        this.onScrollHandler = this.onScrollHandler.bind(this);
        this.getCurrentListInfo = this.getCurrentListInfo.bind(this);
        this.renderItems = this.renderItems.bind(this);
        this.scrollIntoView = this.scrollIntoView.bind(this);

        this.debouncedOnScrollEndHandler = debounce(this.onScrollEndHandler, DEBOUNCE_SCROLL_THRESHOLD);
        this.throttledOnScrollHandler = throttle(this.onScrollHandler, THROTTLE_SCROLL_THRESHOLD);
    }

    /**
     * Destroys the virtual scroller
     *
     * @return {void}
     */
    destroy() {
        if (this.anchorEl && this.scrollingEl) {
            this.anchorEl.removeChild(this.scrollingEl);
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

        // Create the scrolling container element
        this.scrollingEl = document.createElement('div');
        this.scrollingEl.className = 'bp-vs';

        // Create the true height content container
        this.listEl = this.createListElement();

        this.scrollingEl.appendChild(this.listEl);
        this.anchorEl.appendChild(this.scrollingEl);

        this.resize(this.containerHeight);

        const initialRowIndex = config.initialRowIndex || 0;
        // If initialRowIndex is < the first window into the list, then just render from the first item
        this.renderItems(initialRowIndex < this.maxRenderedItems ? 0 : initialRowIndex);

        this.scrollIntoView(initialRowIndex);

        this.bindDOMListeners();

        if (config.onInit) {
            const listInfo = this.getCurrentListInfo();
            config.onInit(listInfo);
        }
    }

    /**
     * Given the container height, calculate the virtual window properties
     * @param {number} containerHeight - the available container height of the virtual scroller
     * @return {void}
     */
    resize(containerHeight) {
        if (!containerHeight || !isFinite(containerHeight)) {
            return;
        }

        this.containerHeight = containerHeight;

        this.totalViewItems = Math.floor(this.containerHeight / (this.itemHeight + this.margin));
        this.maxBufferHeight = this.totalViewItems * this.itemHeight;
        this.maxRenderedItems = (this.totalViewItems + 1) * BUFFERED_ITEM_MULTIPLIER;
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
            items = this.getListItems().map(listItemEl =>
                listItemEl && listItemEl.children ? listItemEl.children[0] : null,
            );
        }

        return {
            startOffset: curStartOffset,
            endOffset: curEndOffset,
            items,
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

        // If specified offset is in the last window into the list then
        // render that last window instead of starting at that offset
        const lastWindowOffset = Math.max(0, this.totalItems - this.maxRenderedItems);
        let newStartOffset = offset > lastWindowOffset ? lastWindowOffset : offset;
        let newEndOffset = offset + this.maxRenderedItems;
        // If the default count of items to render exceeds the totalItems count
        // then just render up to the end
        if (newEndOffset >= this.totalItems) {
            newEndOffset = this.totalItems - 1;
        }

        // Creates a document fragment for the new list items to be appended into the list
        const fragment = document.createDocumentFragment();

        if (curStartOffset <= offset && offset <= curEndOffset) {
            // Scenario #1: New start offset falls within the current range of items rendered
            //      |--------------------|
            //  curStartOffset       curEndOffset
            //          |--------------------|
            //   newStartOffset          newEndOffset
            newStartOffset = curEndOffset + 1;
            // Create elements from curEnd + 1 to newEndOffset
            this.createItems(fragment, newStartOffset, newEndOffset);
            // Delete the elements from curStartOffset to newStartOffset
            this.deleteItems(this.listEl, curStartOffset - curStartOffset, offset - curStartOffset);
            // Append the document fragment to the listEl
            this.listEl.appendChild(fragment);
        } else if (curStartOffset <= newEndOffset && newEndOffset <= curEndOffset) {
            // Scenario #2: New end offset falls within the current range of items rendered
            //                |--------------------|
            //          curStartOffset        curEndOffset
            //          |--------------------|
            //    newStartOffset        newEndOffset

            // Create elements from newStartOffset to curStart - 1
            this.createItems(fragment, offset, curStartOffset - 1);
            // Delete the elements from newEndOffset to the end
            this.deleteItems(this.listEl, newEndOffset - curStartOffset + 1);
            // Insert before the firstElementChild of the listEl
            this.listEl.insertBefore(fragment, this.listEl.firstElementChild);
        } else {
            // Scenario #3: New range has no overlap with current range of items
            //                          |--------------------|
            //                    curStartOffset        curEndOffset
            //  |--------------------|
            // newStartOffset    newEndOffset
            this.createItems(fragment, newStartOffset, newEndOffset);
            // Delete all the current elements (if any)
            this.deleteItems(this.listEl);
            this.listEl.appendChild(fragment);
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

        for (let i = start; i <= end; i += 1) {
            const newEl = this.renderItem(i);
            newListEl.appendChild(newEl);
        }
    }

    /**
     * Deletes elements of the 'ol'
     *
     * @param {HTMLElement} listEl - the `ol` element
     * @param {number} [start] - start index
     * @param {number} [end] - end index
     * @return {void}
     */
    deleteItems(listEl, start = 0, end) {
        if (!listEl || start < 0 || end < 0) {
            return;
        }

        const listItems = Array.prototype.slice.call(listEl.children, start, end);
        listItems.forEach(listItem => listEl.removeChild(listItem));
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

    /**
     * Scrolls the provided row index into view.
     * @param {number} rowIndex - the index of the row in the overall list
     * @return {void}
     */
    scrollIntoView(rowIndex) {
        if (!this.scrollingEl || rowIndex < 0 || rowIndex >= this.totalItems) {
            return;
        }

        // See if the list item indexed by `rowIndex` is already present
        const foundItem = this.getListItems().find(listItem => {
            const { bpVsRowIndex } = listItem.dataset;
            const parsedRowIndex = parseInt(bpVsRowIndex, 10);
            return parsedRowIndex === rowIndex;
        });

        if (foundItem) {
            // If it is already present and visible, do nothing, but if not visible
            // then scroll it into view
            if (!this.isVisible(foundItem)) {
                foundItem.scrollIntoView({ block: 'nearest' });
            }
        } else {
            // If it is not present, then adjust the scrollTop so that the list item
            // will get rendered.
            const topPosition = (this.itemHeight + this.margin) * rowIndex;
            this.scrollingEl.scrollTop = topPosition;
            // Some browsers don't fire the scroll event when setting scrollTop
            // (IE11 & Firefox) so we need to manually dispatch the event
            // in order to trigger `onScrollHandler` to render the items
            this.scrollingEl.dispatchEvent(new Event('scroll'));
        }
    }

    /**
     * Checks to see whether the provided list item element is currently visible
     * @param {HTMLElement} listItemEl - the list item elment
     * @return {boolean} Returns true if the list item is visible, false otherwise
     */
    isVisible(listItemEl) {
        if (!this.scrollingEl || !listItemEl) {
            return false;
        }

        const { scrollTop } = this.scrollingEl;
        const { offsetTop } = listItemEl;

        // Ensure that the offsetTop and entire height of the listItemEl are inside the visible window
        return scrollTop <= offsetTop && offsetTop + this.itemHeight <= scrollTop + this.containerHeight;
    }

    /**
     * Gets the currently visible list items
     * @return {Array<HTMLElement>} - the list of current visible list items
     */
    getVisibleItems() {
        if (!this.listEl) {
            return [];
        }

        return this.getListItems()
            .filter(itemEl => this.isVisible(itemEl))
            .map(itemEl => itemEl && itemEl.children && itemEl.children[0]);
    }

    /**
     * Gets the list items of this.listEl as an array
     * @return {Array<HTMLElement>} - the list items
     */
    getListItems() {
        if (!this.listEl) {
            return [];
        }

        return Array.prototype.slice.call(this.listEl.children);
    }
}

export default VirtualScroller;
