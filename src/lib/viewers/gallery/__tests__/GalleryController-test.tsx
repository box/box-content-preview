import GalleryController, { GalleryControllerOptions } from '../GalleryController';

jest.mock('../../../Thumbnail', () => {
    return jest.fn().mockImplementation(() => ({
        init: jest.fn().mockResolvedValue(undefined),
        getImageFromCache: jest.fn().mockReturnValue(null),
        createThumbnailImage: jest.fn().mockResolvedValue(null),
        destroy: jest.fn(),
    }));
});

// Stub react-dom/client so tests focus on controller behavior, not React reconciliation.
// (createRoot's async commit interacts badly with afterEach DOM teardown under fake timers.)
// The render/unmount mocks are accessible via mockLastRoot so tests can assert on grid props.
let mockLastRoot: { render: jest.Mock; unmount: jest.Mock };
jest.mock('react-dom/client', () => ({
    createRoot: jest.fn(() => {
        mockLastRoot = { render: jest.fn(), unmount: jest.fn() };
        return mockLastRoot;
    }),
}));

const THUMBNAILS_SIDEBAR_TRANSITION_TIME = 301;

type Sidebar = { isOpen: boolean; setCurrentPage: jest.Mock };

interface Harness {
    controller: GalleryController;
    containerEl: HTMLElement;
    pdfViewer: { currentPageNumber: number; pagesCount: number };
    sidebar: Sidebar | null;
    setPage: jest.Mock;
    toggleThumbnails: jest.Mock;
    requestUiUpdate: jest.Mock;
    focusToggle: jest.Mock;
    onBeforeOpen: jest.Mock;
    onAfterClose: jest.Mock;
}

function makeController(
    overrides: {
        sidebarOpen?: boolean;
        sidebarPresent?: boolean;
        pageCount?: number;
        currentPage?: number;
        flagOn?: boolean;
    } = {},
): Harness {
    const { sidebarOpen = false, sidebarPresent = true, pageCount = 10, currentPage = 1, flagOn = true } = overrides;

    const containerEl = document.createElement('div');
    document.body.appendChild(containerEl);

    const pdfViewer = { currentPageNumber: currentPage, pagesCount: pageCount };
    const sidebar: Sidebar | null = sidebarPresent ? { isOpen: sidebarOpen, setCurrentPage: jest.fn() } : null;
    const setPage = jest.fn((n: number) => {
        pdfViewer.currentPageNumber = n;
    });
    const toggleThumbnails = jest.fn(() => {
        if (sidebar) sidebar.isOpen = !sidebar.isOpen;
    });
    const requestUiUpdate = jest.fn();
    const focusToggle = jest.fn();
    const onBeforeOpen = jest.fn();
    const onAfterClose = jest.fn();

    const opts: GalleryControllerOptions = {
        containerEl,
        features: { galleryView: { enabled: flagOn } },
        getPdfViewer: () => pdfViewer,
        getPreloader: () => null,
        getThumbnailsSidebar: () => sidebar,
        setPage,
        toggleThumbnails,
        requestUiUpdate,
        focusToggle,
        onBeforeOpen,
        onAfterClose,
    };

    return {
        controller: new GalleryController(opts),
        containerEl,
        pdfViewer,
        sidebar,
        setPage,
        toggleThumbnails,
        requestUiUpdate,
        focusToggle,
        onBeforeOpen,
        onAfterClose,
    };
}

describe('GalleryController', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
        document.body.innerHTML = '';
    });

    describe('destroy', () => {
        test('should cancel a deferred mount scheduled while sidebar was open', () => {
            const { controller, containerEl } = makeController({ sidebarOpen: true });
            controller.toggle();
            expect(containerEl.children).toHaveLength(0);

            controller.destroy();
            jest.advanceTimersByTime(THUMBNAILS_SIDEBAR_TRANSITION_TIME);
            expect(containerEl.children).toHaveLength(0);
        });

        test('should tear down DOM and reset isOpen when destroyed while gallery is open', () => {
            const { controller, containerEl } = makeController({ sidebarOpen: false });
            controller.toggle();
            expect(controller.isOpen).toBe(true);
            expect(containerEl.children).toHaveLength(1);

            controller.destroy();

            expect(controller.isOpen).toBe(false);
            expect(containerEl.children).toHaveLength(0);
        });
    });

    describe('canRender', () => {
        test.each`
            pages  | flag     | expected
            ${1}   | ${true}  | ${false}
            ${2}   | ${true}  | ${true}
            ${200} | ${true}  | ${true}
            ${201} | ${true}  | ${false}
            ${50}  | ${false} | ${false}
        `('should return $expected when pages=$pages and flag=$flag', ({ pages, flag, expected }) => {
            const { controller } = makeController({ flagOn: flag });
            expect(controller.canRender(pages)).toBe(expected);
        });
    });

    describe('toggle', () => {
        test('should mount grid synchronously and update UI when sidebar is closed', () => {
            const { controller, containerEl, requestUiUpdate } = makeController({ sidebarOpen: false });
            controller.toggle();
            expect(controller.isOpen).toBe(true);
            expect(containerEl.children).toHaveLength(1);
            expect(requestUiUpdate).toHaveBeenCalledTimes(1);
        });

        test('should not call focusToggle on open', () => {
            const { controller, focusToggle } = makeController({ sidebarOpen: false });
            controller.toggle();
            expect(focusToggle).not.toHaveBeenCalled();
        });

        test('should call focusToggle on close', () => {
            const { controller, focusToggle } = makeController({ sidebarOpen: false });
            controller.toggle();
            expect(focusToggle).not.toHaveBeenCalled();
            controller.toggle();
            expect(focusToggle).toHaveBeenCalledTimes(1);
        });

        test('should call onBeforeOpen on open and not on close', () => {
            const { controller, onBeforeOpen } = makeController({ sidebarOpen: false });
            controller.toggle();
            expect(onBeforeOpen).toHaveBeenCalledTimes(1);
            controller.toggle();
            expect(onBeforeOpen).toHaveBeenCalledTimes(1);
        });

        test('should call onAfterClose on close and not on open', () => {
            const { controller, onAfterClose } = makeController({ sidebarOpen: false });
            controller.toggle();
            expect(onAfterClose).not.toHaveBeenCalled();
            controller.toggle();
            expect(onAfterClose).toHaveBeenCalledTimes(1);
        });

        describe('gallery open state', () => {
            function seedDoc(containerEl: HTMLElement) {
                const doc = document.createElement('div');
                doc.className = 'bp-doc';
                containerEl.appendChild(doc);
                return doc;
            }

            test('should add the container class and mark bp-doc inert on open', () => {
                const { controller, containerEl } = makeController({ sidebarOpen: false });
                const doc = seedDoc(containerEl);

                controller.toggle();

                expect(containerEl.classList.contains('bp-is-gallery-open')).toBe(true);
                expect(doc.hasAttribute('inert')).toBe(true);
            });

            test('should clear the container class and bp-doc inert on close', () => {
                const { controller, containerEl } = makeController({ sidebarOpen: false });
                const doc = seedDoc(containerEl);

                controller.toggle();
                controller.toggle();

                expect(containerEl.classList.contains('bp-is-gallery-open')).toBe(false);
                expect(doc.hasAttribute('inert')).toBe(false);
            });

            test('should clear the container class and bp-doc inert on destroy while gallery is open', () => {
                const { controller, containerEl } = makeController({ sidebarOpen: false });
                const doc = seedDoc(containerEl);

                controller.toggle();
                expect(containerEl.classList.contains('bp-is-gallery-open')).toBe(true);
                expect(doc.hasAttribute('inert')).toBe(true);

                controller.destroy();
                expect(containerEl.classList.contains('bp-is-gallery-open')).toBe(false);
                expect(doc.hasAttribute('inert')).toBe(false);
            });

            test('should apply the open state immediately even when grid mount is deferred behind the sidebar', () => {
                const { controller, containerEl } = makeController({ sidebarOpen: true });
                const doc = seedDoc(containerEl);

                controller.toggle();

                // Grid mount is deferred (only the seeded .bp-doc is present), but the open state applies right away
                expect(containerEl.children).toHaveLength(1);
                expect(containerEl.classList.contains('bp-is-gallery-open')).toBe(true);
                expect(doc.hasAttribute('inert')).toBe(true);
            });
        });

        // Tab is intentionally not trapped: with .bp-doc inert, natural tab order flows from
        // the gallery controls out to the host's sidebar/header. Verify keys pressed inside
        // the container bubble freely so DocBaseViewer.onKeydown (via the host) can own the
        // gallery-wide Escape/arrow policy.
        test('should not intercept keydown events on containerEl while the gallery is open', () => {
            const { controller, containerEl } = makeController({ sidebarOpen: false });
            const toggle = document.createElement('button');
            toggle.className = 'bp-GalleryToggle';
            containerEl.appendChild(toggle);
            controller.toggle();

            const documentSpy = jest.fn();
            document.addEventListener('keydown', documentSpy);
            try {
                ['Tab', 'Escape', 'ArrowDown', '['].forEach(key => {
                    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
                    toggle.dispatchEvent(event);
                    expect(event.defaultPrevented).toBe(false);
                });
                expect(documentSpy).toHaveBeenCalledTimes(4);
                expect(controller.isOpen).toBe(true);
            } finally {
                document.removeEventListener('keydown', documentSpy);
            }
        });

        test('should wire the correct props into GalleryGrid', () => {
            const { controller } = makeController({ currentPage: 3, pageCount: 25, sidebarOpen: false });
            controller.toggle();

            expect(mockLastRoot.render).toHaveBeenCalledTimes(1);
            const grid = mockLastRoot.render.mock.calls[0][0];
            expect(grid.props.currentPage).toBe(3);
            expect(grid.props.pageCount).toBe(25);
            expect(grid.props.thumbnail).toBeDefined();
            expect(grid.props.onClose).toBe(controller.toggle);
            expect(typeof grid.props.onPageNavigate).toBe('function');
            expect(typeof grid.props.onFocusChange).toBe('function');
            expect(typeof grid.props.getPageRatio).toBe('function');
        });

        describe('getPageRatio prop', () => {
            function getGridGetPageRatio(controller: GalleryController): (pageNum: number) => number | null {
                controller.toggle();
                return mockLastRoot.render.mock.calls[0][0].props.getPageRatio;
            }

            test('should return the page ratio from fetched PDF.js page metadata', () => {
                const { controller, pdfViewer } = makeController({ sidebarOpen: false });
                (pdfViewer as { getPageView?: unknown }).getPageView = (index: number) =>
                    index === 1 ? { pdfPage: {}, viewport: { width: 1600, height: 900 } } : undefined;

                const getPageRatio = getGridGetPageRatio(controller);

                expect(getPageRatio(2)).toBeCloseTo(16 / 9);
            });

            test('should return null while the page metadata has not been fetched', () => {
                const { controller, pdfViewer } = makeController({ sidebarOpen: false });
                // pdfPage missing: the view still carries the first page's default viewport
                (pdfViewer as { getPageView?: unknown }).getPageView = () => ({
                    viewport: { width: 800, height: 600 },
                });

                const getPageRatio = getGridGetPageRatio(controller);

                expect(getPageRatio(2)).toBeNull();
            });

            test('should return null when the viewer does not expose getPageView', () => {
                const { controller } = makeController({ sidebarOpen: false });

                const getPageRatio = getGridGetPageRatio(controller);

                expect(getPageRatio(1)).toBeNull();
            });
        });

        test('should close sidebar first and defer grid mount by half the transition time when sidebar is open', () => {
            const { controller, containerEl, toggleThumbnails } = makeController({ sidebarOpen: true });
            controller.toggle();
            expect(toggleThumbnails).toHaveBeenCalledTimes(1);
            expect(containerEl.children).toHaveLength(0);

            jest.advanceTimersByTime(THUMBNAILS_SIDEBAR_TRANSITION_TIME / 2);
            expect(containerEl.children).toHaveLength(1);
        });

        test('should navigate to focused page when it differs from the current page on close', () => {
            const { controller, setPage } = makeController({ currentPage: 1, sidebarOpen: false });
            controller.toggle();
            // Simulate the grid reporting focus on page 5 via its onFocusChange callback
            const grid = mockLastRoot.render.mock.calls[0][0];
            grid.props.onFocusChange(5);
            controller.toggle();
            expect(setPage).toHaveBeenCalledWith(5);
        });

        test('should not navigate when focused page matches current page on close', () => {
            const { controller, setPage } = makeController({ currentPage: 3, sidebarOpen: false });
            controller.toggle();
            controller.toggle();
            expect(setPage).not.toHaveBeenCalled();
        });

        test('should restore sidebar and schedule setCurrentPage when sidebar was open before', () => {
            const { controller, sidebar, toggleThumbnails } = makeController({ sidebarOpen: true });
            controller.toggle();
            jest.advanceTimersByTime(THUMBNAILS_SIDEBAR_TRANSITION_TIME / 2);

            const grid = mockLastRoot.render.mock.calls[0][0];
            grid.props.onFocusChange(7);
            controller.toggle();

            expect(toggleThumbnails).toHaveBeenCalledTimes(2);

            jest.advanceTimersByTime(THUMBNAILS_SIDEBAR_TRANSITION_TIME);
            expect(sidebar!.setCurrentPage).toHaveBeenCalledWith(7);
        });

        test('should close gallery and navigate when onPageNavigate fires from the grid', () => {
            const { controller, setPage } = makeController({ currentPage: 1, sidebarOpen: false });
            controller.toggle();
            expect(controller.isOpen).toBe(true);

            const grid = mockLastRoot.render.mock.calls[0][0];
            grid.props.onPageNavigate(8);

            expect(setPage).toHaveBeenCalledWith(8);
            expect(controller.isOpen).toBe(false);
        });
    });

    describe('handleEscape', () => {
        test('should return false when gallery is closed', () => {
            const { controller } = makeController();
            expect(controller.handleEscape()).toBe(false);
            expect(controller.isOpen).toBe(false);
        });

        test('should return true and close the gallery when open', () => {
            const { controller } = makeController();
            controller.toggle();
            expect(controller.handleEscape()).toBe(true);
            expect(controller.isOpen).toBe(false);
        });
    });

    describe('handleArrowKey', () => {
        // Adds the selected tile to the gallery root (mounted before .bp-ControlsRoot; with no
        // controls seeded it lands as containerEl's last child).
        function seedSelectedTile(containerEl: HTMLElement): HTMLElement {
            const galleryEl = containerEl.lastElementChild as HTMLElement;
            const tile = document.createElement('div');
            tile.setAttribute('role', 'option');
            tile.setAttribute('tabindex', '0');
            galleryEl.appendChild(tile);
            return tile;
        }

        function seedToggle(containerEl: HTMLElement): HTMLElement {
            const toggle = document.createElement('button');
            toggle.className = 'bp-GalleryToggle';
            containerEl.appendChild(toggle);
            return toggle;
        }

        test('should refocus the selected tile and replay the arrow into the grid when target is outside it', () => {
            const { controller, containerEl } = makeController({ sidebarOpen: false });
            const toggle = seedToggle(containerEl);
            controller.toggle();
            const tile = seedSelectedTile(containerEl);
            const tileKeydown = jest.fn();
            tile.addEventListener('keydown', tileKeydown);

            controller.handleArrowKey('ArrowDown', toggle);

            expect(document.activeElement).toBe(tile);
            expect(tileKeydown).toHaveBeenCalledTimes(1);
            expect(tileKeydown.mock.calls[0][0].key).toBe('ArrowDown');
        });

        test('should not redirect focus for non-arrow keys', () => {
            const { controller, containerEl } = makeController({ sidebarOpen: false });
            const toggle = seedToggle(containerEl);
            controller.toggle();
            seedSelectedTile(containerEl);

            toggle.focus();
            controller.handleArrowKey('[', toggle);

            expect(document.activeElement).toBe(toggle);
        });

        test('should not redirect when the target is already inside the grid (no re-entry)', () => {
            const { controller, containerEl } = makeController({ sidebarOpen: false });
            controller.toggle();
            const tile = seedSelectedTile(containerEl);
            const tileKeydown = jest.fn();
            tile.addEventListener('keydown', tileKeydown);

            controller.handleArrowKey('ArrowDown', tile);

            expect(tileKeydown).not.toHaveBeenCalled();
        });

        test('should be a no-op when the gallery is closed', () => {
            const { controller, containerEl } = makeController({ sidebarOpen: false });
            const toggle = seedToggle(containerEl);

            toggle.focus();
            controller.handleArrowKey('ArrowDown', toggle);

            expect(document.activeElement).toBe(toggle);
        });
    });

    describe('handleRotate', () => {
        test('should be a no-op when gallery has never been opened', () => {
            const { controller } = makeController();
            expect(() => controller.handleRotate()).not.toThrow();
        });

        test('should destroy the cached thumbnail instance after the gallery has been opened', () => {
            const { controller } = makeController({ sidebarOpen: false });
            controller.toggle();
            // The thumbnail prop the grid received is the cached instance the controller owns
            const grid = mockLastRoot.render.mock.calls[0][0];
            const cached = grid.props.thumbnail as { destroy: jest.Mock };
            controller.handleRotate();
            expect(cached.destroy).toHaveBeenCalled();
        });
    });
});
