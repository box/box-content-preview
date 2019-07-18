/* eslint-disable no-unused-expressions */
import VirtualScroller from '../VirtualScroller';

let virtualScroller;
let stubs = {};

const sandbox = sinon.sandbox.create();

describe('VirtualScroller', () => {
    before(() => fixture.setBase('src/lib'));

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
        it('should initialize anchorEl and previousScrollTop', () => {
            expect(virtualScroller.anchorEl.id).to.be.equal('test-virtual-scroller');
            expect(virtualScroller.previousScrollTop).to.be.equal(0);
        });
    });

    describe('destroy()', () => {
        it('should remove the HTML element references', () => {
            const scrollingEl = { remove: () => {} };
            sandbox.stub(scrollingEl, 'remove');

            virtualScroller.scrollingEl = scrollingEl;
            virtualScroller.listEl = {};

            virtualScroller.destroy();

            expect(scrollingEl.remove).to.be.called;
            expect(virtualScroller.scrollingEl).to.be.null;
            expect(virtualScroller.listEl).to.be.null;
        });
    });

    describe('init()', () => {
        beforeEach(() => {
            stubs.validateRequiredConfig = sandbox.stub(virtualScroller, 'validateRequiredConfig');
            stubs.renderItems = sandbox.stub(virtualScroller, 'renderItems');
        });

        it('should parse the config object', () => {
            stubs.renderItemFn = sandbox.stub();
            stubs.bindDOMListeners = sandbox.stub(virtualScroller, 'bindDOMListeners');

            virtualScroller.init({
                totalItems: 10,
                itemHeight: 100,
                containerHeight: 500,
                renderItemFn: stubs.renderItemFn,
            });

            expect(virtualScroller.totalItems).to.be.equal(10);
            expect(virtualScroller.itemHeight).to.be.equal(100);
            expect(virtualScroller.containerHeight).to.be.equal(500);
            expect(virtualScroller.renderItemFn).to.be.equal(stubs.renderItemFn);
            expect(virtualScroller.margin).to.be.equal(0);
            expect(virtualScroller.totalViewItems).to.be.equal(5);
            expect(virtualScroller.maxBufferHeight).to.be.equal(500);
            expect(virtualScroller.maxRenderedItems).to.be.equal(18);

            expect(virtualScroller.scrollingEl.classList.contains('bp-vs')).to.be.true;
            expect(virtualScroller.listEl.classList.contains('bp-vs-list')).to.be.true;

            expect(stubs.renderItems).to.be.called;
            expect(stubs.bindDOMListeners).to.be.called;
        });

        it('should call onInit if provided', () => {
            const mockListInfo = {};
            stubs.getCurrentListInfo = sandbox.stub(virtualScroller, 'getCurrentListInfo').returns(mockListInfo);
            stubs.onInitHandler = sandbox.stub();

            virtualScroller.init({
                totalItems: 10,
                itemHeight: 100,
                containerHeight: 500,
                renderItemFn: stubs.renderItemFn,
                onInit: stubs.onInitHandler,
            });

            expect(stubs.onInitHandler).to.be.calledWith(mockListInfo);
        });

        it('should call renderItems with the provided initialRowIndex', () => {
            stubs.renderItemFn = sandbox.stub();

            virtualScroller.init({
                totalItems: 10,
                itemHeight: 100,
                containerHeight: 500,
                renderItemFn: stubs.renderItemFn,
                initialRowIndex: 50,
            });

            expect(stubs.renderItems).to.be.calledWith(50);
        });

        it('should call renderItems with 0 if initialRowIndex falls within first window', () => {
            stubs.renderItemFn = sandbox.stub();

            virtualScroller.init({
                totalItems: 10,
                itemHeight: 100,
                containerHeight: 500,
                renderItemFn: stubs.renderItemFn,
                initialRowIndex: 2,
            });

            expect(stubs.renderItems).to.be.calledWith(0);
        });
    });

    describe('validateRequiredConfig()', () => {
        it('should not throw an error if config is good', () => {
            expect(() =>
                virtualScroller.validateRequiredConfig({
                    totalItems: 10,
                    itemHeight: 100,
                    renderItemFn: () => {},
                    containerHeight: 500,
                }),
            ).to.not.throw();
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
            it(`should throw an error if config is bad: ${data.name}`, () => {
                expect(() => virtualScroller.validateRequiredConfig(data.config)).to.throw();
            });
        });
    });

    describe('onScrollHandler()', () => {
        beforeEach(() => {
            stubs.renderItems = sandbox.stub(virtualScroller, 'renderItems');
            virtualScroller.maxBufferHeight = 100;
        });

        it('should not proceed if the scroll movement < maxBufferHeight', () => {
            virtualScroller.previousScrollTop = 0;
            virtualScroller.onScrollHandler({ target: { scrollTop: 10 } });

            expect(stubs.renderItems).to.not.be.called;
        });

        it('should proceed if positive scroll movement > maxBufferHeight', () => {
            virtualScroller.previousScrollTop = 0;
            virtualScroller.onScrollHandler({ target: { scrollTop: 101 } });

            expect(stubs.renderItems).to.be.called;
            expect(virtualScroller.previousScrollTop).to.be.equal(101);
        });

        it('should proceed if negative scroll movement > maxBufferHeight', () => {
            virtualScroller.previousScrollTop = 102;
            virtualScroller.onScrollHandler({ target: { scrollTop: 1 } });

            expect(stubs.renderItems).to.be.called;
            expect(virtualScroller.previousScrollTop).to.be.equal(1);
        });
    });

    describe('renderItems()', () => {
        let newListEl;
        let curListEl;

        beforeEach(() => {
            stubs.appendChild = sandbox.stub();
            stubs.insertBefore = sandbox.stub();
            curListEl = { appendChild: stubs.appendChild, insertBefore: stubs.insertBefore };
            newListEl = {};
            virtualScroller.listEl = curListEl;
            virtualScroller.maxRenderedItems = 10;
            virtualScroller.totalItems = 100;

            stubs.renderItem = sandbox.stub(virtualScroller, 'renderItem');
            stubs.getCurrentListInfo = sandbox.stub(virtualScroller, 'getCurrentListInfo');
            stubs.createItems = sandbox.stub(virtualScroller, 'createItems');
            stubs.deleteItems = sandbox.stub(virtualScroller, 'deleteItems');
            stubs.createDocumentFragment = sandbox.stub(document, 'createDocumentFragment').returns(newListEl);
        });

        it('should render the whole range of items (no reuse)', () => {
            stubs.getCurrentListInfo.returns({
                startOffset: -1,
                endOffset: -1,
            });
            virtualScroller.renderItems();

            expect(stubs.deleteItems).to.be.calledWith(curListEl);
            expect(stubs.createItems).to.be.calledWith(newListEl, 0, 10);
            expect(stubs.appendChild).to.be.called;
            expect(stubs.insertBefore).not.to.be.called;
        });

        it('should render the last window into the list', () => {
            stubs.getCurrentListInfo.returns({
                startOffset: -1,
                endOffset: -1,
            });
            virtualScroller.renderItems(95);

            expect(stubs.deleteItems).to.be.calledWith(curListEl);
            expect(stubs.createItems).to.be.calledWith(newListEl, 90, 99);
            expect(stubs.appendChild).to.be.called;
            expect(stubs.insertBefore).not.to.be.called;
        });

        it('should render items above the current list', () => {
            stubs.getCurrentListInfo.returns({
                startOffset: 20,
                endOffset: 30,
            });
            virtualScroller.renderItems(15);

            expect(stubs.deleteItems).to.be.called;
            expect(stubs.createItems).to.be.calledWith(newListEl, 15, 19);
            expect(stubs.appendChild).not.to.be.called;
            expect(stubs.insertBefore).to.be.called;
        });
    });

    describe('renderItem()', () => {
        it('should render an item absolutely positioned with arbitrary content', () => {
            const renderedThumbnail = document.createElement('button');
            renderedThumbnail.className = 'rendered-thumbnail';
            stubs.renderItemFn = sandbox.stub().returns(renderedThumbnail);

            virtualScroller.itemHeight = 100;
            virtualScroller.margin = 0;
            virtualScroller.renderItemFn = stubs.renderItemFn;

            const item = virtualScroller.renderItem(0);
            expect(stubs.renderItemFn).to.be.called;
            expect(item.classList.contains('bp-vs-list-item')).to.be.true;
            expect(item.firstChild.classList.contains('rendered-thumbnail')).to.be.true;
        });

        it('should still render the item even if renderItemFn throws an error', () => {
            const renderedThumbnail = document.createElement('button');
            renderedThumbnail.className = 'rendered-thumbnail';
            stubs.renderItemFn = sandbox.stub().throws();

            virtualScroller.itemHeight = 100;
            virtualScroller.margin = 0;
            virtualScroller.renderItemFn = stubs.renderItemFn;

            const item = virtualScroller.renderItem(0);
            expect(stubs.renderItemFn).to.be.called;
            expect(item.classList.contains('bp-vs-list-item')).to.be.true;
            expect(item.firstChild).to.be.null;
        });
    });

    describe('createListElement()', () => {
        it('should return the list element', () => {
            virtualScroller.totalItems = 10;
            virtualScroller.itemHeight = 100;
            virtualScroller.margin = 0;

            expect(virtualScroller.createListElement().classList.contains('bp-vs-list')).to.be.true;
        });
    });

    describe('onScrollEndHandler()', () => {
        beforeEach(() => {
            stubs.getCurrentListInfo = sandbox.stub(virtualScroller, 'getCurrentListInfo');
        });

        it('should do nothing if onScrollEnd is not set', () => {
            virtualScroller.onScrollEndHandler();

            expect(stubs.getCurrentListInfo).not.to.be.called;
        });

        it('should call onScrollEnd with listInfo object', () => {
            stubs.onScrollEnd = sandbox.stub();
            virtualScroller.onScrollEnd = stubs.onScrollEnd;

            virtualScroller.onScrollEndHandler();

            expect(stubs.getCurrentListInfo).to.be.called;
            expect(stubs.onScrollEnd).to.be.called;
        });
    });

    describe('getCurrentListInfo()', () => {
        let item1;
        let item2;

        beforeEach(() => {
            item1 = { data: 'hello' };
            item2 = { data: 'bye' };
        });

        it('should return -1 for offsets if elements do not exist', () => {
            virtualScroller.listEl = {
                children: [{ children: [item1] }, { children: [item2] }],
            };

            const retObj = virtualScroller.getCurrentListInfo();
            expect(retObj.startOffset).to.be.equal(-1);
            expect(retObj.endOffset).to.be.equal(-1);
            expect(retObj.items).to.be.eql([item1, item2]);
        });

        it('should return -1 for offsets if data attribute is not a number', () => {
            virtualScroller.listEl = {
                firstElementChild: { children: [item1], dataset: {} },
                lastElementChild: { children: [item2], dataset: {} },
                children: [{ children: [item1] }, { children: [item2] }],
            };

            const retObj = virtualScroller.getCurrentListInfo();
            expect(retObj.startOffset).to.be.equal(-1);
            expect(retObj.endOffset).to.be.equal(-1);
            expect(retObj.items).to.be.eql([item1, item2]);
        });

        it('should retrieve the correct data attributes for start and end offsets', () => {
            virtualScroller.listEl = {
                firstElementChild: { children: [item1], dataset: { bpVsRowIndex: '0' } },
                lastElementChild: { children: [item2], dataset: { bpVsRowIndex: '10' } },
                children: [{ children: [item1] }, { children: [item2] }],
            };

            const retObj = virtualScroller.getCurrentListInfo();
            expect(retObj.startOffset).to.be.equal(0);
            expect(retObj.endOffset).to.be.equal(10);
            expect(retObj.items).to.be.eql([item1, item2]);
        });

        it('should return [] for items if no children', () => {
            virtualScroller.listEl = {
                firstElementChild: { children: [item1], dataset: {} },
                lastElementChild: { children: [item2], dataset: {} },
            };

            const retObj = virtualScroller.getCurrentListInfo();
            expect(retObj.startOffset).to.be.equal(-1);
            expect(retObj.endOffset).to.be.equal(-1);
            expect(retObj.items).to.be.empty;
        });
    });

    describe('deleteItems()', () => {
        let listEl;

        beforeEach(() => {
            stubs.removeChild = sandbox.stub();
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
            it(`should do nothing if ${testData.name}`, () => {
                const { listEl: list, start, end } = testData;

                virtualScroller.deleteItems(list, start, end);

                expect(stubs.removeChild).not.to.be.called;
            });
        });

        it('should remove the items specified', () => {
            const list = {
                children: [{}, {}, {}, {}],
                removeChild: stubs.removeChild,
            };

            virtualScroller.deleteItems(list, 0, 1);

            expect(stubs.removeChild).to.be.calledOnce;
        });

        it('should remove the items specified from start to the end when end is not provided', () => {
            const list = {
                children: [{}, {}, {}, {}],
                removeChild: stubs.removeChild,
            };

            virtualScroller.deleteItems(list, 2);

            expect(stubs.removeChild).to.be.calledTwice;
        });
    });

    describe('createItems()', () => {
        let newListEl;

        beforeEach(() => {
            stubs.appendChild = sandbox.stub();
            stubs.renderItem = sandbox.stub(virtualScroller, 'renderItem');
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
            it(`should do nothing if ${testData.name}`, () => {
                const { newListEl: newList, start, end } = testData;

                virtualScroller.createItems(newList, start, end);

                expect(stubs.appendChild).not.to.be.called;
            });
        });

        it('should create the new items specified', () => {
            virtualScroller.createItems(newListEl, 0, 2);

            expect(stubs.renderItem).to.be.calledThrice;
            expect(stubs.appendChild).to.be.calledThrice;
        });
    });

    describe('scrollIntoView()', () => {
        let scrollingEl;
        let listEl;

        beforeEach(() => {
            stubs.dispatchEvent = sandbox.stub();
            scrollingEl = { remove: () => {}, dispatchEvent: stubs.dispatchEvent };

            virtualScroller.totalItems = 10;
            virtualScroller.itemHeight = 10;
            virtualScroller.margin = 0;
            virtualScroller.scrollingEl = scrollingEl;

            stubs.isVisible = sandbox.stub(virtualScroller, 'isVisible');
            stubs.scrollIntoView = sandbox.stub();

            listEl = {
                children: [
                    { dataset: { bpVsRowIndex: 0 }, scrollIntoView: stubs.scrollIntoView },
                    { dataset: { bpVsRowIndex: 1 }, scrollIntoView: stubs.scrollIntoView },
                    { dataset: { bpVsRowIndex: 2 }, scrollIntoView: stubs.scrollIntoView },
                ],
            };
        });

        it('should do nothing if scrollingEl is falsy', () => {
            virtualScroller.scrollingEl = undefined;

            virtualScroller.scrollIntoView(1);

            expect(stubs.isVisible).not.to.be.called;
            expect(scrollingEl.scrollTop).to.be.undefined;
            expect(stubs.dispatchEvent).not.to.be.called;
        });

        it('should do nothing if rowIndex is < 0', () => {
            virtualScroller.scrollIntoView(-1);

            expect(stubs.isVisible).not.to.be.called;
            expect(scrollingEl.scrollTop).to.be.undefined;
            expect(stubs.dispatchEvent).not.to.be.called;
        });

        it('should do nothing if rowIndex is = totalItems', () => {
            virtualScroller.scrollIntoView(10);

            expect(stubs.isVisible).not.to.be.called;
            expect(scrollingEl.scrollTop).to.be.undefined;
            expect(stubs.dispatchEvent).not.to.be.called;
        });

        it('should do nothing if rowIndex is > totalItems', () => {
            virtualScroller.scrollIntoView(11);

            expect(stubs.isVisible).not.to.be.called;
            expect(scrollingEl.scrollTop).to.be.undefined;
            expect(stubs.dispatchEvent).not.to.be.called;
        });

        it('should set the scroll top if item is not found', () => {
            virtualScroller.listEl = listEl;

            virtualScroller.scrollIntoView(8);

            expect(stubs.isVisible).not.to.be.called;
            expect(stubs.scrollIntoView).not.to.be.called;
            expect(scrollingEl.scrollTop).not.to.be.undefined;
            expect(stubs.dispatchEvent).to.be.called;
        });

        it('should scroll item into view if found but not visible', () => {
            virtualScroller.listEl = listEl;
            stubs.isVisible.returns(false);

            virtualScroller.scrollIntoView(1);

            expect(stubs.isVisible).to.be.called;
            expect(stubs.scrollIntoView).to.be.called;
            expect(scrollingEl.scrollTop).to.be.undefined;
            expect(stubs.dispatchEvent).not.to.be.called;
        });

        it('should not scroll if item is found and visible', () => {
            virtualScroller.listEl = listEl;
            stubs.isVisible.returns(true);

            virtualScroller.scrollIntoView(1);

            expect(stubs.isVisible).to.be.called;
            expect(stubs.scrollIntoView).not.to.be.called;
            expect(scrollingEl.scrollTop).to.be.undefined;
            expect(stubs.dispatchEvent).not.to.be.called;
        });
    });

    describe('isVisible()', () => {
        beforeEach(() => {
            const scrollingEl = { scrollTop: 100, remove: () => {} };
            virtualScroller.scrollingEl = scrollingEl;
            virtualScroller.containerHeight = 100;
            virtualScroller.itemHeight = 20;
        });

        it('should return false if scrollingEl is falsy', () => {
            virtualScroller.scrollingEl = false;

            expect(virtualScroller.isVisible({})).to.be.false;
        });

        it('should return false if listItemEl is falsy', () => {
            expect(virtualScroller.isVisible()).to.be.false;
        });

        it('should return false if the offsetTop of listItemEl is < scrollTop', () => {
            expect(virtualScroller.isVisible({ offsetTop: 50 })).to.be.false;
        });

        it('should return false if the offsetTop of listItemEl is > scrollTop + containerHeight', () => {
            expect(virtualScroller.isVisible({ offsetTop: 201 })).to.be.false;
        });

        it('should return true if the offsetTop + itemHeight of listItemEl is fully within the containerHeight', () => {
            expect(virtualScroller.isVisible({ offsetTop: 120 })).to.be.true;
        });

        it('should return false if the offsetTop + itemHeight of listItemEl is not fully within the containerHeight', () => {
            expect(virtualScroller.isVisible({ offsetTop: 190 })).to.be.false;
        });
    });

    describe('getVisibleItems()', () => {
        it('should return empty list if listEl is falsy', () => {
            virtualScroller.listEl = false;

            expect(virtualScroller.getVisibleItems()).to.be.empty;
        });

        it('should return only visible list items', () => {
            const listEl = {
                children: [{ children: [{ val: 1 }] }, { children: [{ val: 2 }] }, { children: [{ val: 3 }] }],
            };

            const expectedItems = [{ val: 1 }, { val: 3 }];

            stubs.isVisible = sandbox.stub(virtualScroller, 'isVisible');
            // Only the first and third children are visible
            stubs.isVisible.onFirstCall().returns(true);
            stubs.isVisible.onSecondCall().returns(false);
            stubs.isVisible.onThirdCall().returns(true);

            virtualScroller.listEl = listEl;

            expect(virtualScroller.getVisibleItems()).to.be.eql(expectedItems);
        });
    });

    describe('resize()', () => {
        it('should do nothing if containerHeight is not provided', () => {
            virtualScroller.containerHeight = 1;
            virtualScroller.totalViewItems = 2;
            virtualScroller.maxBufferHeight = 3;
            virtualScroller.maxRenderedItems = 4;

            virtualScroller.resize();

            expect(virtualScroller.containerHeight).to.be.equal(1);
            expect(virtualScroller.totalViewItems).to.be.equal(2);
            expect(virtualScroller.maxBufferHeight).to.be.equal(3);
            expect(virtualScroller.maxRenderedItems).to.be.equal(4);
        });

        it('should do nothing if containerHeight is not a number', () => {
            virtualScroller.containerHeight = 1;
            virtualScroller.totalViewItems = 2;
            virtualScroller.maxBufferHeight = 3;
            virtualScroller.maxRenderedItems = 4;

            virtualScroller.resize('123');

            expect(virtualScroller.containerHeight).to.be.equal(1);
            expect(virtualScroller.totalViewItems).to.be.equal(2);
            expect(virtualScroller.maxBufferHeight).to.be.equal(3);
            expect(virtualScroller.maxRenderedItems).to.be.equal(4);
        });

        it('should update the virtual window properties', () => {
            virtualScroller.itemHeight = 10;
            virtualScroller.margin = 0;
            virtualScroller.containerHeight = 1;
            virtualScroller.totalViewItems = 2;
            virtualScroller.maxBufferHeight = 3;
            virtualScroller.maxRenderedItems = 4;

            virtualScroller.resize(100);

            expect(virtualScroller.containerHeight).to.be.equal(100);
            expect(virtualScroller.totalViewItems).to.be.equal(10);
            expect(virtualScroller.maxBufferHeight).to.be.equal(100);
            expect(virtualScroller.maxRenderedItems).to.be.equal(33);
        });
    });
});
