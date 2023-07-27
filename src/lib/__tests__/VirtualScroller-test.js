/* eslint-disable no-unused-expressions */
import VirtualScroller from '../VirtualScroller';

let virtualScroller;
let stubs = {};

const sandbox = sinon.createSandbox();

describe('VirtualScroller', () => {
    beforeEach(() => {
        fixture.load('__tests__/VirtualScroller-test.html');
        virtualScroller = new VirtualScroller(document.getElementById('test-virtual-scroller'));
    });

    afterEach(() => {
        fixture.cleanup();
        sandbox.verifyAndRestore();

        if (virtualScroller && typeof virtualScroller.destroy === 'function') {
            virtualScroller.destroy();
        }

        virtualScroller = null;
        stubs = {};
    });

    describe('constructor()', () => {
        test('should initialize anchorEl and previousScrollTop', () => {
            expect(virtualScroller.anchorEl.id).toBe('test-virtual-scroller');
            expect(virtualScroller.previousScrollTop).toBe(0);
        });
    });

    describe('destroy()', () => {
        test('should remove the HTML element references', () => {
            jest.spyOn(virtualScroller.anchorEl, 'removeChild').mockImplementation();

            virtualScroller.scrollingEl = document.createElement('div');
            virtualScroller.listEl = {};

            virtualScroller.destroy();

            expect(virtualScroller.anchorEl.removeChild).toBeCalled();
            expect(virtualScroller.scrollingEl).toBeNull();
            expect(virtualScroller.listEl).toBeNull();
        });
    });

    describe('init()', () => {
        beforeEach(() => {
            stubs.validateRequiredConfig = jest.spyOn(virtualScroller, 'validateRequiredConfig').mockImplementation();
            stubs.renderItems = jest.spyOn(virtualScroller, 'renderItems').mockImplementation();
        });

        test('should parse the config object', () => {
            stubs.renderItemFn = jest.fn();
            stubs.bindDOMListeners = jest.spyOn(virtualScroller, 'bindDOMListeners').mockImplementation();

            virtualScroller.init({
                totalItems: 10,
                itemHeight: 100,
                containerHeight: 500,
                renderItemFn: stubs.renderItemFn,
            });

            expect(virtualScroller.totalItems).toBe(10);
            expect(virtualScroller.itemHeight).toBe(100);
            expect(virtualScroller.containerHeight).toBe(500);
            expect(virtualScroller.renderItemFn).toBe(stubs.renderItemFn);
            expect(virtualScroller.margin).toBe(0);
            expect(virtualScroller.totalViewItems).toBe(5);
            expect(virtualScroller.maxBufferHeight).toBe(500);
            expect(virtualScroller.maxRenderedItems).toBe(18);

            expect(virtualScroller.scrollingEl.classList.contains('bp-vs')).toBe(true);
            expect(virtualScroller.listEl.classList.contains('bp-vs-list')).toBe(true);

            expect(stubs.renderItems).toBeCalled();
            expect(stubs.bindDOMListeners).toBeCalled();
        });

        test('should call onInit if provided', () => {
            const mockListInfo = {};
            stubs.getCurrentListInfo = jest.spyOn(virtualScroller, 'getCurrentListInfo').mockReturnValue(mockListInfo);
            stubs.onInitHandler = jest.fn();
            stubs.renderItemFn = jest.fn();

            virtualScroller.init({
                totalItems: 10,
                itemHeight: 100,
                containerHeight: 500,
                renderItemFn: stubs.renderItemFn,
                onInit: stubs.onInitHandler,
            });

            expect(stubs.onInitHandler).toBeCalledWith(mockListInfo);
        });

        test('should call renderItems with the provided initialRowIndex', () => {
            stubs.renderItemFn = jest.fn();

            virtualScroller.init({
                totalItems: 10,
                itemHeight: 100,
                containerHeight: 500,
                renderItemFn: stubs.renderItemFn,
                initialRowIndex: 50,
            });

            expect(stubs.renderItems).toBeCalledWith(50);
        });

        test('should call renderItems with 0 if initialRowIndex falls within first window', () => {
            stubs.renderItemFn = jest.fn();

            virtualScroller.init({
                totalItems: 10,
                itemHeight: 100,
                containerHeight: 500,
                renderItemFn: stubs.renderItemFn,
                initialRowIndex: 2,
            });

            expect(stubs.renderItems).toBeCalledWith(0);
        });
    });

    describe('validateRequiredConfig()', () => {
        test('should not throw an error if config is good', () => {
            expect(() =>
                virtualScroller.validateRequiredConfig({
                    totalItems: 10,
                    itemHeight: 100,
                    renderItemFn: () => {},
                    containerHeight: 500,
                }),
            ).not.toThrow();
        });

        [
            { name: 'totalItems falsy', config: {} },
            { name: 'totalItems not finite', config: { totalItems: '10' } },
            { name: 'itemHeight falsy', config: { totalItems: 10 } },
            { name: 'itemHeight not finite', config: { totalItems: 10, itemHeight: '100' } },
            { name: 'renderItemFn falsy', config: { totalItems: 10, itemHeight: 100 } },
            { name: 'renderItemFn not a function', config: { totalItems: 10, itemHeight: 100, renderItemFn: 'hi' } },
            { name: 'containerHeight falsy', config: { totalItems: 10, itemHeight: 100, renderItemFn: () => {} } },
            {
                name: 'containerHeight not finite',
                config: { totalItems: 10, itemHeight: 100, renderItemFn: () => {}, containerHeight: '500' },
            },
        ].forEach(data => {
            test(`should throw an error if config is bad: ${data.name}`, () => {
                expect(() => virtualScroller.validateRequiredConfig(data.config)).toThrow();
            });
        });
    });

    describe('onScrollHandler()', () => {
        beforeEach(() => {
            stubs.renderItems = jest.spyOn(virtualScroller, 'renderItems').mockImplementation();
            virtualScroller.maxBufferHeight = 100;
        });

        test('should not proceed if the scroll movement < maxBufferHeight', () => {
            virtualScroller.previousScrollTop = 0;
            virtualScroller.onScrollHandler({ target: { scrollTop: 10 } });

            expect(stubs.renderItems).not.toBeCalled();
        });

        test('should proceed if positive scroll movement > maxBufferHeight', () => {
            virtualScroller.previousScrollTop = 0;
            virtualScroller.onScrollHandler({ target: { scrollTop: 101 } });

            expect(stubs.renderItems).toBeCalled();
            expect(virtualScroller.previousScrollTop).toBe(101);
        });

        test('should proceed if negative scroll movement > maxBufferHeight', () => {
            virtualScroller.previousScrollTop = 102;
            virtualScroller.onScrollHandler({ target: { scrollTop: 1 } });

            expect(stubs.renderItems).toBeCalled();
            expect(virtualScroller.previousScrollTop).toBe(1);
        });
    });

    describe('renderItems()', () => {
        let newListEl;
        let curListEl;

        beforeEach(() => {
            stubs.appendChild = jest.fn();
            stubs.insertBefore = jest.fn();
            curListEl = { appendChild: stubs.appendChild, insertBefore: stubs.insertBefore };
            newListEl = {};
            virtualScroller.listEl = curListEl;
            virtualScroller.maxRenderedItems = 10;
            virtualScroller.totalItems = 100;

            stubs.renderItem = jest.spyOn(virtualScroller, 'renderItem').mockImplementation();
            stubs.getCurrentListInfo = jest.spyOn(virtualScroller, 'getCurrentListInfo').mockImplementation();
            stubs.createItems = jest.spyOn(virtualScroller, 'createItems').mockImplementation();
            stubs.deleteItems = jest.spyOn(virtualScroller, 'deleteItems').mockImplementation();
            stubs.createDocumentFragment = jest.spyOn(document, 'createDocumentFragment').mockReturnValue(newListEl);
        });

        test('should render the whole range of items (no reuse)', () => {
            stubs.getCurrentListInfo.mockReturnValue({
                startOffset: -1,
                endOffset: -1,
            });
            virtualScroller.renderItems();

            expect(stubs.deleteItems).toBeCalledWith(curListEl);
            expect(stubs.createItems).toBeCalledWith(newListEl, 0, 10);
            expect(stubs.appendChild).toBeCalled();
            expect(stubs.insertBefore).not.toBeCalled();
        });

        test('should render the last window into the list', () => {
            stubs.getCurrentListInfo.mockReturnValue({
                startOffset: -1,
                endOffset: -1,
            });
            virtualScroller.renderItems(95);

            expect(stubs.deleteItems).toBeCalledWith(curListEl);
            expect(stubs.createItems).toBeCalledWith(newListEl, 90, 99);
            expect(stubs.appendChild).toBeCalled();
            expect(stubs.insertBefore).not.toBeCalled();
        });

        test('should render items above the current list', () => {
            stubs.getCurrentListInfo.mockReturnValue({
                startOffset: 20,
                endOffset: 30,
            });
            virtualScroller.renderItems(15);

            expect(stubs.deleteItems).toBeCalled();
            expect(stubs.createItems).toBeCalledWith(newListEl, 15, 19);
            expect(stubs.appendChild).not.toBeCalled();
            expect(stubs.insertBefore).toBeCalled();
        });
    });

    describe('renderItem()', () => {
        test('should render an item absolutely positioned with arbitrary content', () => {
            const renderedThumbnail = document.createElement('button');
            renderedThumbnail.className = 'rendered-thumbnail';
            stubs.renderItemFn = jest.fn().mockReturnValue(renderedThumbnail);

            virtualScroller.itemHeight = 100;
            virtualScroller.margin = 0;
            virtualScroller.renderItemFn = stubs.renderItemFn;

            const item = virtualScroller.renderItem(0);
            expect(stubs.renderItemFn).toBeCalled();
            expect(item.classList.contains('bp-vs-list-item')).toBe(true);
            expect(item.firstChild.classList.contains('rendered-thumbnail')).toBe(true);
        });

        test('should still render the item even if renderItemFn throws an error', () => {
            const renderedThumbnail = document.createElement('button');
            renderedThumbnail.className = 'rendered-thumbnail';

            stubs.consoleError = jest.spyOn(console, 'error').mockImplementation();
            stubs.renderItemFn = jest.fn(() => {
                throw new Error();
            });

            virtualScroller.itemHeight = 100;
            virtualScroller.margin = 0;
            virtualScroller.renderItemFn = stubs.renderItemFn;

            const item = virtualScroller.renderItem(0);
            expect(stubs.renderItemFn).toBeCalled();
            expect(item.classList.contains('bp-vs-list-item')).toBe(true);
            expect(item.firstChild).toBeNull();
        });
    });

    describe('createListElement()', () => {
        test('should return the list element', () => {
            virtualScroller.totalItems = 10;
            virtualScroller.itemHeight = 100;
            virtualScroller.margin = 0;

            expect(virtualScroller.createListElement().classList.contains('bp-vs-list')).toBe(true);
        });
    });

    describe('onScrollEndHandler()', () => {
        beforeEach(() => {
            stubs.getCurrentListInfo = jest.spyOn(virtualScroller, 'getCurrentListInfo').mockImplementation();
        });

        test('should do nothing if onScrollEnd is not set', () => {
            virtualScroller.onScrollEndHandler();

            expect(stubs.getCurrentListInfo).not.toBeCalled();
        });

        test('should call onScrollEnd with listInfo object', () => {
            stubs.onScrollEnd = jest.fn();
            virtualScroller.onScrollEnd = stubs.onScrollEnd;

            virtualScroller.onScrollEndHandler();

            expect(stubs.getCurrentListInfo).toBeCalled();
            expect(stubs.onScrollEnd).toBeCalled();
        });
    });

    describe('getCurrentListInfo()', () => {
        let item1;
        let item2;

        beforeEach(() => {
            item1 = { data: 'hello' };
            item2 = { data: 'bye' };
        });

        test('should return -1 for offsets if elements do not exist', () => {
            virtualScroller.listEl = {
                children: [{ children: [item1] }, { children: [item2] }],
            };

            const retObj = virtualScroller.getCurrentListInfo();
            expect(retObj.startOffset).toBe(-1);
            expect(retObj.endOffset).toBe(-1);
            expect(retObj.items).toEqual([item1, item2]);
        });

        test('should return -1 for offsets if data attribute is not a number', () => {
            virtualScroller.listEl = {
                firstElementChild: { children: [item1], dataset: {} },
                lastElementChild: { children: [item2], dataset: {} },
                children: [{ children: [item1] }, { children: [item2] }],
            };

            const retObj = virtualScroller.getCurrentListInfo();
            expect(retObj.startOffset).toBe(-1);
            expect(retObj.endOffset).toBe(-1);
            expect(retObj.items).toEqual([item1, item2]);
        });

        test('should retrieve the correct data attributes for start and end offsets', () => {
            virtualScroller.listEl = {
                firstElementChild: { children: [item1], dataset: { bpVsRowIndex: '0' } },
                lastElementChild: { children: [item2], dataset: { bpVsRowIndex: '10' } },
                children: [{ children: [item1] }, { children: [item2] }],
            };

            const retObj = virtualScroller.getCurrentListInfo();
            expect(retObj.startOffset).toBe(0);
            expect(retObj.endOffset).toBe(10);
            expect(retObj.items).toEqual([item1, item2]);
        });

        test('should return [] for items if no children', () => {
            virtualScroller.listEl = {
                firstElementChild: { children: [item1], dataset: {} },
                lastElementChild: { children: [item2], dataset: {} },
            };

            const retObj = virtualScroller.getCurrentListInfo();
            expect(retObj.startOffset).toBe(-1);
            expect(retObj.endOffset).toBe(-1);
            expect(retObj.items).toEqual([]);
        });
    });

    describe('deleteItems()', () => {
        let listEl;

        beforeEach(() => {
            stubs.removeChild = jest.fn();
            listEl = { removeChild: stubs.removeChild };
        });

        const paramaterizedTests = [
            { name: 'no listEl provided', listEl: undefined, start: 1, end: 2 },
            { name: 'no start provided', listEl, start: undefined, end: 2 },
            { name: 'no end provided', listEl, start: 1, end: undefined },
            { name: 'start is < 0 provided', listEl, start: -1, end: 2 },
            { name: 'end is < 0 provided', listEl, start: 1, end: -1 },
        ];

        paramaterizedTests.forEach(testData => {
            test(`should do nothing if ${testData.name}`, () => {
                const { listEl: list, start, end } = testData;

                virtualScroller.deleteItems(list, start, end);

                expect(stubs.removeChild).not.toBeCalled();
            });
        });

        test('should remove the items specified', () => {
            const list = {
                children: [{}, {}, {}, {}],
                removeChild: stubs.removeChild,
            };

            virtualScroller.deleteItems(list, 0, 1);

            expect(stubs.removeChild).toBeCalledTimes(1);
        });

        test('should remove the items specified from start to the end when end is not provided', () => {
            const list = {
                children: [{}, {}, {}, {}],
                removeChild: stubs.removeChild,
            };

            virtualScroller.deleteItems(list, 2);

            expect(stubs.removeChild).toBeCalledTimes(2);
        });
    });

    describe('createItems()', () => {
        let newListEl;

        beforeEach(() => {
            stubs.appendChild = jest.fn();
            stubs.renderItem = jest.spyOn(virtualScroller, 'renderItem').mockImplementation();
            newListEl = { appendChild: stubs.appendChild };
        });

        const paramaterizedTests = [
            { name: 'no newListEl provided', newListEl: undefined, oldListEl: {}, start: 1, end: 2 },
            { name: 'no start provided', newListEl, oldListEl: {}, start: undefined, end: 2 },
            { name: 'no end provided', newListEl, oldListEl: {}, start: 1, end: undefined },
            { name: 'start is < 0 provided', newListEl, oldListEl: {}, start: -1, end: 2 },
            { name: 'end is < 0 provided', newListEl, oldListEl: {}, start: 1, end: -1 },
        ];

        paramaterizedTests.forEach(testData => {
            test(`should do nothing if ${testData.name}`, () => {
                const { newListEl: newList, start, end } = testData;

                virtualScroller.createItems(newList, start, end);

                expect(stubs.appendChild).not.toBeCalled();
            });
        });

        test('should create the new items specified', () => {
            virtualScroller.createItems(newListEl, 0, 2);

            expect(stubs.renderItem).toBeCalledTimes(3);
            expect(stubs.appendChild).toBeCalledTimes(3);
        });
    });

    describe('scrollIntoView()', () => {
        let scrollingEl;
        let listEl;

        beforeEach(() => {
            stubs.dispatchEvent = jest.fn();
            scrollingEl = { dispatchEvent: stubs.dispatchEvent };

            virtualScroller.totalItems = 10;
            virtualScroller.itemHeight = 10;
            virtualScroller.margin = 0;
            virtualScroller.scrollingEl = scrollingEl;

            stubs.isVisible = jest.spyOn(virtualScroller, 'isVisible').mockImplementation();
            stubs.removeChild = jest.spyOn(virtualScroller.anchorEl, 'removeChild').mockImplementation();
            stubs.scrollIntoView = jest.fn();

            listEl = {
                children: [
                    { dataset: { bpVsRowIndex: 0 }, scrollIntoView: stubs.scrollIntoView },
                    { dataset: { bpVsRowIndex: 1 }, scrollIntoView: stubs.scrollIntoView },
                    { dataset: { bpVsRowIndex: 2 }, scrollIntoView: stubs.scrollIntoView },
                ],
            };
        });

        test('should do nothing if scrollingEl is falsy', () => {
            virtualScroller.scrollingEl = undefined;

            virtualScroller.scrollIntoView(1);

            expect(stubs.isVisible).not.toBeCalled();
            expect(scrollingEl.scrollTop).toBeUndefined();
            expect(stubs.dispatchEvent).not.toBeCalled();
        });

        test('should do nothing if rowIndex is < 0', () => {
            virtualScroller.scrollIntoView(-1);

            expect(stubs.isVisible).not.toBeCalled();
            expect(scrollingEl.scrollTop).toBeUndefined();
            expect(stubs.dispatchEvent).not.toBeCalled();
        });

        test('should do nothing if rowIndex is = totalItems', () => {
            virtualScroller.scrollIntoView(10);

            expect(stubs.isVisible).not.toBeCalled();
            expect(scrollingEl.scrollTop).toBeUndefined();
            expect(stubs.dispatchEvent).not.toBeCalled();
        });

        test('should do nothing if rowIndex is > totalItems', () => {
            virtualScroller.scrollIntoView(11);

            expect(stubs.isVisible).not.toBeCalled();
            expect(scrollingEl.scrollTop).toBeUndefined();
            expect(stubs.dispatchEvent).not.toBeCalled();
        });

        test('should set the scroll top if item is not found', () => {
            virtualScroller.listEl = listEl;

            virtualScroller.scrollIntoView(8);

            expect(stubs.isVisible).not.toBeCalled();
            expect(stubs.scrollIntoView).not.toBeCalled();
            expect(scrollingEl.scrollTop).toBeDefined();
            expect(stubs.dispatchEvent).toBeCalled();
        });

        test('should scroll item into view if found but not visible', () => {
            virtualScroller.listEl = listEl;
            stubs.isVisible.mockReturnValue(false);

            virtualScroller.scrollIntoView(1);

            expect(stubs.isVisible).toBeCalled();
            expect(stubs.scrollIntoView).toBeCalledWith({ block: 'nearest' });
            expect(scrollingEl.scrollTop).toBeUndefined();
            expect(stubs.dispatchEvent).not.toBeCalled();
        });

        test('should not scroll if item is found and visible', () => {
            virtualScroller.listEl = listEl;
            stubs.isVisible.mockReturnValue(true);

            virtualScroller.scrollIntoView(1);

            expect(stubs.isVisible).toBeCalled();
            expect(stubs.scrollIntoView).not.toBeCalled();
            expect(scrollingEl.scrollTop).toBeUndefined();
            expect(stubs.dispatchEvent).not.toBeCalled();
        });
    });

    describe('isVisible()', () => {
        beforeEach(() => {
            jest.spyOn(virtualScroller.anchorEl, 'removeChild').mockImplementation();

            virtualScroller.scrollingEl = { scrollTop: 100 };
            virtualScroller.containerHeight = 100;
            virtualScroller.itemHeight = 20;
        });

        test('should return false if scrollingEl is falsy', () => {
            virtualScroller.scrollingEl = false;

            expect(virtualScroller.isVisible({})).toBe(false);
        });

        test('should return false if listItemEl is falsy', () => {
            expect(virtualScroller.isVisible()).toBe(false);
        });

        test('should return false if the offsetTop of listItemEl is < scrollTop', () => {
            expect(virtualScroller.isVisible({ offsetTop: 50 })).toBe(false);
        });

        test('should return false if the offsetTop of listItemEl is > scrollTop + containerHeight', () => {
            expect(virtualScroller.isVisible({ offsetTop: 201 })).toBe(false);
        });

        test('should return true if the offsetTop + itemHeight of listItemEl is fully within the containerHeight', () => {
            expect(virtualScroller.isVisible({ offsetTop: 120 })).toBe(true);
        });

        test('should return false if the offsetTop + itemHeight of listItemEl is not fully within the containerHeight', () => {
            expect(virtualScroller.isVisible({ offsetTop: 190 })).toBe(false);
        });
    });

    describe('getVisibleItems()', () => {
        test('should return empty list if listEl is falsy', () => {
            virtualScroller.listEl = false;

            expect(virtualScroller.getVisibleItems()).toEqual([]);
        });

        test('should return only visible list items', () => {
            const listEl = {
                children: [{ children: [{ val: 1 }] }, { children: [{ val: 2 }] }, { children: [{ val: 3 }] }],
            };

            const expectedItems = [{ val: 1 }, { val: 3 }];

            // Only the first and third children are visible
            stubs.isVisible = jest
                .spyOn(virtualScroller, 'isVisible')
                .mockImplementationOnce(() => true)
                .mockImplementationOnce(() => false)
                .mockImplementationOnce(() => true);

            virtualScroller.listEl = listEl;

            expect(virtualScroller.getVisibleItems()).toEqual(expectedItems);
        });
    });

    describe('resize()', () => {
        test('should do nothing if containerHeight is not provided', () => {
            virtualScroller.containerHeight = 1;
            virtualScroller.totalViewItems = 2;
            virtualScroller.maxBufferHeight = 3;
            virtualScroller.maxRenderedItems = 4;

            virtualScroller.resize();

            expect(virtualScroller.containerHeight).toBe(1);
            expect(virtualScroller.totalViewItems).toBe(2);
            expect(virtualScroller.maxBufferHeight).toBe(3);
            expect(virtualScroller.maxRenderedItems).toBe(4);
        });

        test('should do nothing if containerHeight is not a number', () => {
            virtualScroller.containerHeight = 1;
            virtualScroller.totalViewItems = 2;
            virtualScroller.maxBufferHeight = 3;
            virtualScroller.maxRenderedItems = 4;

            virtualScroller.resize('123');

            expect(virtualScroller.containerHeight).toBe(1);
            expect(virtualScroller.totalViewItems).toBe(2);
            expect(virtualScroller.maxBufferHeight).toBe(3);
            expect(virtualScroller.maxRenderedItems).toBe(4);
        });

        test('should update the virtual window properties', () => {
            virtualScroller.itemHeight = 10;
            virtualScroller.margin = 0;
            virtualScroller.containerHeight = 1;
            virtualScroller.totalViewItems = 2;
            virtualScroller.maxBufferHeight = 3;
            virtualScroller.maxRenderedItems = 4;

            virtualScroller.resize(100);

            expect(virtualScroller.containerHeight).toBe(100);
            expect(virtualScroller.totalViewItems).toBe(10);
            expect(virtualScroller.maxBufferHeight).toBe(100);
            expect(virtualScroller.maxRenderedItems).toBe(33);
        });
    });
});
