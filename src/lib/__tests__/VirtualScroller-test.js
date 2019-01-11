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
        });

        it('should parse the config object', () => {
            stubs.renderItemFn = sandbox.stub();
            stubs.renderItems = sandbox.stub(virtualScroller, 'renderItems');
            stubs.bindDOMListeners = sandbox.stub(virtualScroller, 'bindDOMListeners');

            virtualScroller.init({
                totalItems: 10,
                itemHeight: 100,
                containerHeight: 500,
                renderItemFn: stubs.renderItemFn
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
                onInit: stubs.onInitHandler
            });

            expect(stubs.onInitHandler).to.be.calledWith(mockListInfo);
        });
    });

    describe('validateRequiredConfig()', () => {
        it('should not throw an error if config is good', () => {
            expect(() =>
                virtualScroller.validateRequiredConfig({
                    totalItems: 10,
                    itemHeight: 100,
                    renderItemFn: () => {},
                    containerHeight: 500
                })
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
                config: { totalItems: 10, itemHeight: 100, renderItemFn: () => {}, containerHeight: '500' }
            }
        ].forEach((data) => {
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
        const curListEl = {};

        beforeEach(() => {
            virtualScroller.scrollingEl = { replaceChild: () => {} };
            virtualScroller.listEl = curListEl;
            newListEl = { appendChild: () => {} };
            stubs.createListElement = sandbox.stub(virtualScroller, 'createListElement').returns(newListEl);
            stubs.renderItem = sandbox.stub(virtualScroller, 'renderItem');
            stubs.replaceChild = sandbox.stub(virtualScroller.scrollingEl, 'replaceChild');
            stubs.appendChild = sandbox.stub(newListEl, 'appendChild');
            stubs.getCurrentListInfo = sandbox.stub(virtualScroller, 'getCurrentListInfo');
            stubs.cloneItems = sandbox.stub(virtualScroller, 'cloneItems');
            stubs.createItems = sandbox.stub(virtualScroller, 'createItems');
        });

        afterEach(() => {
            virtualScroller.scrollingEl = null;
        });

        it('should render the whole range of items (no reuse)', () => {
            virtualScroller.maxRenderedItems = 10;
            virtualScroller.totalItems = 100;
            stubs.getCurrentListInfo.returns({
                startOffset: -1,
                endOffset: -1
            });
            virtualScroller.renderItems();

            expect(stubs.cloneItems).not.to.be.called;
            expect(stubs.createItems).to.be.calledWith(newListEl, 0, 10);
            expect(virtualScroller.scrollingEl.replaceChild).to.be.called;
        });

        it('should render the remaining items up to totalItems', () => {
            virtualScroller.maxRenderedItems = 10;
            virtualScroller.totalItems = 100;
            stubs.getCurrentListInfo.returns({
                startOffset: -1,
                endOffset: -1
            });
            virtualScroller.renderItems(95);

            expect(stubs.cloneItems).not.to.be.called;
            expect(stubs.createItems).to.be.calledWith(newListEl, 95, 99);
            expect(virtualScroller.scrollingEl.replaceChild).to.be.called;
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
                children: [{ children: [item1] }, { children: [item2] }]
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
                children: [{ children: [item1] }, { children: [item2] }]
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
                children: [{ children: [item1] }, { children: [item2] }]
            };

            const retObj = virtualScroller.getCurrentListInfo();
            expect(retObj.startOffset).to.be.equal(0);
            expect(retObj.endOffset).to.be.equal(10);
            expect(retObj.items).to.be.eql([item1, item2]);
        });

        it('should return [] for items if no children', () => {
            virtualScroller.listEl = {
                firstElementChild: { children: [item1], dataset: {} },
                lastElementChild: { children: [item2], dataset: {} }
            };

            const retObj = virtualScroller.getCurrentListInfo();
            expect(retObj.startOffset).to.be.equal(-1);
            expect(retObj.endOffset).to.be.equal(-1);
            expect(retObj.items).to.be.empty;
        });
    });

    describe('cloneItems()', () => {
        let newListEl;

        beforeEach(() => {
            stubs.appendChild = sandbox.stub();
            newListEl = { appendChild: stubs.appendChild };
        });

        const paramaterizedTests = [
            { name: 'no newListEl provided', newListEl: undefined, start: 1, end: 2 },
            { name: 'no start provided', newListEl, start: undefined, end: 2 },
            { name: 'no end provided', newListEl, start: 1, end: undefined },
            { name: 'start is < 0 provided', newListEl, start: -1, end: 2 },
            { name: 'end is < 0 provided', newListEl, start: 1, end: -1 },
            { name: 'no oldListEl.children', newListEl, start: 1, end: 2 },
            {
                name: 'start is greater than oldListEl.children length',
                newListEl,
                oldListEl: { children: { length: 1 } },
                start: 1,
                end: 3
            },
            {
                name: 'end is greater than oldListEl.children length',
                newListEl,
                oldListEl: { children: { length: 1 } },
                start: 0,
                end: 1
            }
        ];

        paramaterizedTests.forEach((testData) => {
            it(`should do nothing if ${testData.name}`, () => {
                const { newListEl: newList, oldListEl, start, end } = testData;

                virtualScroller.cloneItems(newList, oldListEl, start, end);

                expect(stubs.appendChild).not.to.be.called;
            });
        });

        it('should clone over the items specified', () => {
            const oldListEl = {
                children: [
                    { cloneNode: () => {} },
                    { cloneNode: () => {} },
                    { cloneNode: () => {} },
                    { cloneNode: () => {} }
                ]
            };

            virtualScroller.cloneItems(newListEl, oldListEl, 0, 1);

            expect(stubs.appendChild).to.be.calledTwice;
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
            { name: 'end is < 0 provided', newListEl, oldListEl: {}, start: 1, end: -1 }
        ];

        paramaterizedTests.forEach((testData) => {
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
});
