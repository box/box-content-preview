import { act, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ThumbnailsSidebar from '../ThumbnailsSidebar';
import ThumbnailsSidebarV2 from '../ThumbnailsSidebarV2';
import VirtualScroller from '../VirtualScroller';

describe('ThumbnailsSidebarV2', () => {
    let anchorEl: HTMLElement;
    let onSelect: jest.Mock;
    let sidebar: ThumbnailsSidebarV2;

    const renderThumbnails = async (...itemIndexes: number[]): Promise<HTMLElement[]> => {
        let thumbnailEls: HTMLElement[] = [];
        await act(async () => {
            thumbnailEls = itemIndexes.map(itemIndex => {
                const thumbnailEl = sidebar.createPlaceholderThumbnail(itemIndex);
                anchorEl.appendChild(thumbnailEl);
                return thumbnailEl;
            });
        });
        return thumbnailEls;
    };

    const initVirtualScroller = async (): Promise<VirtualScroller> => {
        const virtualScroller = new VirtualScroller(anchorEl);
        sidebar.virtualScroller = virtualScroller;
        await act(async () =>
            virtualScroller.init({
                containerHeight: 300,
                itemHeight: 100,
                margin: 15,
                onInit: sidebar.generateThumbnailImages,
                onScrollEnd: sidebar.generateThumbnailImages,
                renderItemFn: sidebar.createPlaceholderThumbnail,
                totalItems: 500,
            }),
        );
        return virtualScroller;
    };

    const getRenderedRows = (): HTMLElement[] => within(screen.getByRole('list')).getAllByRole('button');

    const getOverlayEl = (thumbnailEl: HTMLElement): Element =>
        thumbnailEl.querySelector('.bp-ThumbnailsSidebarV2-overlay') as Element;

    beforeEach(() => {
        jest.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
        anchorEl = document.createElement('nav');
        document.body.appendChild(anchorEl);
        onSelect = jest.fn();
        sidebar = new ThumbnailsSidebarV2(anchorEl, { pagesCount: 500 });
        sidebar.currentPage = 2;
        sidebar.onThumbnailSelect = onSelect;
    });

    afterEach(() => {
        act(() => sidebar.destroy());
        anchorEl.remove();
    });

    test('should keep the ThumbnailsSidebar API and mark its anchor', () => {
        expect(sidebar).toBeInstanceOf(ThumbnailsSidebar);
        expect(anchorEl).toHaveClass('bp-ThumbnailsSidebarV2');
    });

    test('should render each page as a labeled button with its page number', async () => {
        await renderThumbnails(0, 1, 2);

        const thumbnailEl = screen.getByRole('button', { name: 'Page 3' });
        expect(thumbnailEl).toHaveAttribute('data-bp-page-num', '3');
        expect(within(thumbnailEl).getByText('3')).toBeInTheDocument();
        expect(screen.getAllByRole('button')).toHaveLength(3);
    });

    test('should hide the page number overlay from assistive technology', async () => {
        const [thumbnailEl] = await renderThumbnails(0);

        expect(getOverlayEl(thumbnailEl)).toHaveAttribute('aria-hidden', 'true');
    });

    test('should mark only the current page as selected', async () => {
        await renderThumbnails(0, 1, 2);

        const selectedEl = screen.getByRole('button', { name: 'Page 2' });
        expect(selectedEl).toHaveAttribute('aria-current', 'true');
        expect(selectedEl).toHaveClass('bp-ThumbnailsSidebarV2-item--selected');
        expect(screen.getByRole('button', { name: 'Page 1' })).not.toHaveAttribute('aria-current');
        expect(screen.getByRole('button', { name: 'Page 3' })).not.toHaveClass('bp-ThumbnailsSidebarV2-item--selected');
        expect(document.querySelector('.bp-thumbnail-is-selected')).toBeNull();
    });

    test('should move the selection when setCurrentPage is called', async () => {
        const scrollIntoView = jest.fn();
        sidebar.virtualScroller = { destroy: jest.fn(), scrollIntoView };
        await renderThumbnails(0, 1, 2);

        sidebar.setCurrentPage(3);

        expect(screen.getByRole('button', { name: 'Page 3' })).toHaveAttribute('aria-current', 'true');
        expect(screen.getByRole('button', { name: 'Page 2' })).not.toHaveAttribute('aria-current');
        expect(scrollIntoView).toBeCalledWith(2);
    });

    test('should skip empty rows when applying the selection', async () => {
        await renderThumbnails(0, 1);
        sidebar.currentThumbnails.push(null, undefined);
        sidebar.currentPage = 1;

        expect(() => sidebar.applyCurrentPageSelection()).not.toThrow();
        expect(screen.getByRole('button', { name: 'Page 1' })).toHaveAttribute('aria-current', 'true');
    });

    test('should show a Blueprint ghost while the page image is pending', async () => {
        const [thumbnailEl] = await renderThumbnails(0);

        expect(within(thumbnailEl).getByTestId('bp-ThumbnailsSidebarV2-ghost')).toBeInTheDocument();
        expect(thumbnailEl).not.toHaveClass('bp-thumbnail-image-loaded');
    });

    test('should place a cached page image in the page slot', async () => {
        const imageEl = document.createElement('div');
        sidebar.thumbnail.thumbnailImageCache.set('0', { image: imageEl, inProgress: false });

        const [thumbnailEl] = await renderThumbnails(0);

        expect(thumbnailEl).toHaveClass('bp-thumbnail-image-loaded');
        expect(thumbnailEl.lastElementChild).toContainElement(imageEl);
    });

    test('should place a page image that finishes rendering later in the page slot', async () => {
        const imageEl = document.createElement('div');
        let runFrame: FrameRequestCallback = () => undefined;
        jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
            runFrame = callback;
            return 1;
        });
        jest.spyOn(sidebar.thumbnail, 'createThumbnailImage').mockResolvedValue(imageEl);
        const [thumbnailEl] = await renderThumbnails(0);

        sidebar.requestThumbnailImage(0, thumbnailEl);
        await act(async () => runFrame(0));

        expect(thumbnailEl).toHaveClass('bp-thumbnail-image-loaded');
        expect(thumbnailEl.querySelector('.bp-ThumbnailsSidebarV2-page')).toContainElement(imageEl);
        expect(getOverlayEl(thumbnailEl)).not.toContainElement(imageEl);
    });

    test('should render a row whose cached page render failed', async () => {
        sidebar.thumbnail.thumbnailImageCache.set('0', { inProgress: false });

        const [thumbnailEl] = await renderThumbnails(0);

        expect(screen.getByRole('button', { name: 'Page 1' })).toBe(thumbnailEl);
        expect(within(thumbnailEl).getByTestId('bp-ThumbnailsSidebarV2-ghost')).toBeInTheDocument();
        expect(thumbnailEl).not.toHaveClass('bp-thumbnail-image-loaded');
        expect(thumbnailEl.lastElementChild).toBeEmptyDOMElement();
    });

    test('should select the page when an element inside a thumbnail is clicked', async () => {
        jest.spyOn(anchorEl, 'focus');
        const [, , thumbnailEl] = await renderThumbnails(0, 1, 2);

        await userEvent.click(within(thumbnailEl).getByText('3'));

        expect(onSelect).toBeCalledWith(3);
        expect(anchorEl.focus).toBeCalled();
    });

    test('should ignore clicks outside of a thumbnail', async () => {
        await renderThumbnails(0);

        await userEvent.click(anchorEl);

        expect(onSelect).not.toBeCalled();
    });

    test('should select the adjacent page with the arrow keys', () => {
        fireEvent.keyDown(anchorEl, { key: 'ArrowDown' });
        expect(onSelect).toBeCalledWith(3);

        fireEvent.keyDown(anchorEl, { key: 'ArrowUp' });
        expect(onSelect).toBeCalledWith(1);
    });

    test('should drop the overlay of rows the scroller no longer renders', async () => {
        const [firstEl, , thirdEl] = await renderThumbnails(0, 1, 2);
        firstEl.remove();

        await act(async () => sidebar.generateThumbnailImages({ items: [thirdEl] }));

        expect(getOverlayEl(firstEl)).toBeEmptyDOMElement();
        expect(within(thirdEl).getByText('3')).toBeInTheDocument();
    });

    test('should render the overlay only into the newest element of a re-created row', async () => {
        const [staleEl] = await renderThumbnails(0);
        staleEl.remove();
        const [freshEl] = await renderThumbnails(0);

        expect(getOverlayEl(staleEl)).toBeEmptyDOMElement();
        expect(within(freshEl).getByText('1')).toBeInTheDocument();
    });

    test('should render an overlay for every row in the virtual window', async () => {
        await initVirtualScroller();

        const listItems = within(screen.getByRole('list')).getAllByRole('listitem');
        expect(listItems.length).toBeLessThan(500);
        listItems.forEach((listItem, index) => {
            expect(within(listItem).getByRole('button', { name: `Page ${index + 1}` })).toBeInTheDocument();
            expect(within(listItem).getByText(`${index + 1}`)).toBeInTheDocument();
        });
    });

    test('should not render overlays into rows removed by a scroll that has not ended', async () => {
        jest.useFakeTimers({ doNotFake: ['queueMicrotask'] });

        try {
            const virtualScroller = await initVirtualScroller();
            const initialRows = getRenderedRows();

            await act(async () => {
                virtualScroller.scrollingEl.scrollTop = 2000;
                virtualScroller.scrollingEl.dispatchEvent(new Event('scroll'));
            });

            expect(sidebar.currentThumbnails).toEqual(expect.arrayContaining(initialRows));
            initialRows.forEach(row => {
                expect(row).not.toBeInTheDocument();
                expect(getOverlayEl(row)).toBeEmptyDOMElement();
            });
            getRenderedRows().forEach(row => {
                expect(within(row).getByText(row.dataset.bpPageNum as string)).toBeInTheDocument();
            });
        } finally {
            jest.useRealTimers();
        }
    });

    test('should drop the overlay of rows removed by refresh', async () => {
        await initVirtualScroller();
        const [firstRow] = getRenderedRows();
        jest.spyOn(sidebar.thumbnail, 'init').mockResolvedValue(null);

        await act(async () => {
            await sidebar.refresh();
        });

        expect(firstRow).not.toBeInTheDocument();
        expect(getOverlayEl(firstRow)).toBeEmptyDOMElement();
    });

    test('should unmount the overlays and unmark the anchor when destroyed and tolerate calls after destroy', async () => {
        const [thumbnailEl] = await renderThumbnails(0);

        act(() => sidebar.destroy());

        expect(getOverlayEl(thumbnailEl)).toBeEmptyDOMElement();
        expect(anchorEl).not.toHaveClass('bp-ThumbnailsSidebarV2');
        expect(() => sidebar.renderOverlays()).not.toThrow();
        expect(() => sidebar.destroy()).not.toThrow();
    });
});
