import isFinite from 'lodash/isFinite';

class VirtualScroller {
    constructor(container) {
        /*
            config {
                container:          HTMLElement
                totalNumItems:      Number
                itemHeight:         Number
                maxItemsRendered:   Number
                containerHeight:    Number
                renderItemFn:       Function
            }
         */
        this.container = container;
        this.previousScrollTop = 0;
        this.renderedItems = {};

        this.getPositionOfHighestItem = this.getPositionOfHighestItem.bind(this);
        this.getPositionOfLowestItem = this.getPositionOfLowestItem.bind(this);
        this.handleOnScroll = this.handleOnScroll.bind(this);
        this.pruneRows = this.pruneRows.bind(this);
        this.renderRows = this.renderRows.bind(this);
    }

    destroy() {
        if (this.containerEl) {
            this.containerEl.remove();
        }

        this.renderedItems = {};

        this.containerEl = null;
        this.contentEl = null;
    }

    init(config) {
        if (!config.totalNumItems || !config.itemHeight) {
            throw new Error('Need to provide totalNumItems and itemHeight');
        }

        this.totalNumItems = config.totalNumItems;
        this.itemHeight = config.itemHeight;
        this.containerHeight = config.containerHeight;
        this.pageSize = Math.ceil(this.containerHeight / this.itemHeight);
        this.maxItemsRendered = config.maxItemsRendered || Math.ceil(this.pageSize * 1.5);
        this.renderItemFn = config.renderItemFn;
        this.marginTop = config.marginTop || 0;
        this.marginBottom = config.marginBottom || 0;

        this.containerEl = document.createElement('div');
        this.containerEl.className = 'vs-container';

        this.contentEl = document.createElement('div');
        this.contentEl.className = 'vs-content-container';
        this.contentEl.style.height = `${this.totalNumItems * this.itemHeight + this.marginTop + this.marginBottom}px`;

        this.containerEl.appendChild(this.contentEl);
        this.container.appendChild(this.containerEl);

        this.renderRows(0, Math.min(this.maxItemsRendered, this.totalNumItems));

        this.bindDOMListeners();
    }

    bindDOMListeners() {
        this.containerEl.addEventListener('scroll', this.handleOnScroll);
    }

    handleOnScroll(e) {
        const { scrollTop } = e.target;
        console.log(scrollTop);
        const direction = scrollTop - this.prevScrollTop > 0 ? 'down' : 'up';
        this.prevScrollTop = scrollTop;

        if (direction === 'down') {
            const lowestTop = this.getPositionOfLowestItem();
            if (lowestTop - (scrollTop + this.containerHeight) < this.itemHeight) {
                // add next pages
                const newRowsOffset = Math.floor(lowestTop / this.itemHeight) + 1;
                const rowsToRender =
                    newRowsOffset + this.pageSize > this.totalNumItems
                        ? this.totalNumItems - newRowsOffset
                        : this.pageSize;

                if (rowsToRender > 0) {
                    this.renderRows(newRowsOffset, rowsToRender);

                    // prune previous pages
                    const removeRowsOffset =
                        Math.floor(Math.max(scrollTop - this.containerHeight, 0) / this.itemHeight) - 1;
                    const startIndex = parseInt(this.contentEl.firstElementChild.dataset.item, 10);
                    this.pruneRows(startIndex, removeRowsOffset);
                }
            }
        } else {
            const highestTop = this.getPositionOfHighestItem();
            if (scrollTop - highestTop < this.itemHeight) {
                // add next pages
                const nextRowOffset = Math.floor(highestTop / this.itemHeight);
                const newRowsOffset = Math.max(nextRowOffset - this.pageSize, 0);
                const rowsToRender = nextRowOffset - this.pageSize > 0 ? this.pageSize : nextRowOffset;

                if (rowsToRender > 0) {
                    this.renderRows(newRowsOffset, rowsToRender, true);

                    // prune unnecessary pages
                    const removeRowsOffset = Math.ceil((scrollTop + 2 * this.containerHeight) / this.itemHeight);
                    const removeEndOffset = parseInt(this.contentEl.lastElementChild.dataset.item, 10);
                    this.pruneRows(removeRowsOffset, removeEndOffset);
                }
            }
        }
    }

    getPositionOfLowestItem() {
        const bottomStyle = this.contentEl.lastElementChild.style.top;
        return bottomStyle.substr(0, bottomStyle.indexOf('px'));
    }

    getPositionOfHighestItem() {
        const topStyle = this.contentEl.firstElementChild.style.top;
        return topStyle.substr(0, topStyle.indexOf('px'));
    }

    pruneRows(startIndex, endIndex) {
        if (!isFinite(startIndex) || !isFinite(endIndex) || endIndex < startIndex) {
            return;
        }

        console.log(`pruning rows starting from ${startIndex} to ${endIndex}`);
        for (let i = startIndex; i <= endIndex; i++) {
            if (this.renderedItems[i]) {
                this.renderedItems[i].remove();
                this.renderedItems[i] = null;
            }
        }
    }

    renderRows(offset = 0, count = 15, above = false) {
        console.log(`rendering ${count} rows starting from ${offset}`);
        let numItemsRendered = 0;
        const fragment = document.createDocumentFragment();
        while (numItemsRendered < count) {
            const rowIndex = offset + numItemsRendered;
            const rowEl = this.renderRow(offset + numItemsRendered, this.itemHeight);
            fragment.appendChild(rowEl);
            this.renderedItems[rowIndex] = rowEl;
            numItemsRendered += 1;
        }

        if (above) {
            this.contentEl.insertBefore(fragment, this.contentEl.firstChild);
        } else {
            this.contentEl.appendChild(fragment);
        }
    }

    renderRow(rowIndex, itemHeight) {
        const rowEl = document.createElement('div');
        const topPosition = this.itemHeight * rowIndex + this.marginTop;

        let renderedThumbnail;
        try {
            renderedThumbnail = this.renderItemFn.call(this, rowIndex);
        } catch (e) {
            console.log(e);
        }

        rowEl.style.top = `${topPosition}px`;
        rowEl.style.height = `${itemHeight}px`;
        rowEl.classList.add('vs-content-item');
        rowEl.dataset.item = rowIndex;

        if (renderedThumbnail) {
            rowEl.appendChild(renderedThumbnail);
        }

        return rowEl;
    }
}

export default VirtualScroller;
