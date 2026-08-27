// Doc-viewer-bound: this controller talks to PDF.js (pdfViewer, Thumbnail) and
// the doc-specific ThumbnailsSidebar. If a non-doc viewer ever needs gallery,
// the dependencies below must be abstracted first.

import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import Thumbnail from '../../Thumbnail';
import { FeatureConfig, isFeatureEnabled } from '../../featureChecking';
import {
    GALLERY_MAX_PAGES,
    GALLERY_MAX_SCALE,
    GALLERY_MIN_SCALE,
    GALLERY_SCALE_STEP,
    THUMBNAILS_SIDEBAR_TRANSITION_TIME,
} from './constants';
import GalleryGrid, { GalleryGridHandle, GalleryThumbnail } from './GalleryGrid';
import { PinchDirection } from './useGalleryPinch';

// Controller-owned shape: GalleryGrid only sees the read surface (GalleryThumbnail),
// but the controller also needs destroy() to invalidate the cache on rotate/teardown.
type ManagedGalleryThumbnail = GalleryThumbnail & { destroy: () => void };

// Minimal local shapes for untyped peer modules (pdfjs is JS-only, sidebar is JS-only).
// Only the members the controller actually uses are declared — extend as needed.
interface PdfViewerLike {
    currentPageNumber: number;
    pagesCount: number;
    // PDF.js PDFViewer API. pdfPage is only set once the page's metadata has been fetched;
    // before that, viewport holds the first page's default dimensions.
    getPageView?: (index: number) => { pdfPage?: unknown; viewport?: { width: number; height: number } } | undefined;
}

interface ThumbnailsSidebarLike {
    isOpen: boolean;
    setCurrentPage: (n: number) => void;
}

// The preloader is opaque to the controller; we only forward it into Thumbnail's constructor.
// Type-alias what the Thumbnail constructor expects so the two sides stay in sync.
type PreloaderLike = ConstructorParameters<typeof Thumbnail>[1];

export type GalleryControllerOptions = {
    containerEl: HTMLElement;
    features: FeatureConfig;
    hasTouch: boolean;
    getPdfViewer: () => PdfViewerLike;
    getPreloader: () => PreloaderLike;
    getThumbnailsSidebar: () => ThumbnailsSidebarLike | null;
    setPage: (n: number) => void;
    toggleThumbnails: () => void;
    requestUiUpdate: () => void;
    focusToggle: () => void;
    onBeforeOpen: () => void;
    onAfterClose: () => void;
    onClose: (landedPage: number | null) => void;
    onZoomGesture: (direction: PinchDirection) => void;
};

export default class GalleryController {
    private containerEl: HTMLElement;

    private features: FeatureConfig;

    private hasTouch: boolean;

    private getPdfViewer: () => PdfViewerLike;

    private getPreloader: () => PreloaderLike;

    private getThumbnailsSidebar: () => ThumbnailsSidebarLike | null;

    private setPage: (n: number) => void;

    private toggleThumbnails: () => void;

    private requestUiUpdate: () => void;

    private focusToggle: () => void;

    private onBeforeOpen: () => void;

    private onAfterClose: () => void;

    private onClose: (landedPage: number | null) => void;

    private onZoomGesture: (direction: PinchDirection) => void;

    private galleryRoot: Root | null = null;

    private galleryEl: HTMLDivElement | null = null;

    private galleryGridRef = React.createRef<GalleryGridHandle>();

    private galleryThumbnail: ManagedGalleryThumbnail | null = null;

    private galleryFocusedPage: number | null = null;

    private galleryMountTimeoutId: ReturnType<typeof setTimeout> | null = null;

    private gallerySidebarTimeoutId: ReturnType<typeof setTimeout> | null = null;

    private sidebarWasOpen = false;

    private isGalleryOpen = false;

    private pickedPage: number | null = null;

    private galleryScale = 1;

    constructor(opts: GalleryControllerOptions) {
        this.containerEl = opts.containerEl;
        this.features = opts.features;
        this.hasTouch = opts.hasTouch;
        this.getPdfViewer = opts.getPdfViewer;
        this.getPreloader = opts.getPreloader;
        this.getThumbnailsSidebar = opts.getThumbnailsSidebar;
        this.setPage = opts.setPage;
        this.toggleThumbnails = opts.toggleThumbnails;
        this.requestUiUpdate = opts.requestUiUpdate;
        this.focusToggle = opts.focusToggle;
        this.onBeforeOpen = opts.onBeforeOpen;
        this.onAfterClose = opts.onAfterClose;
        this.onClose = opts.onClose;
        this.onZoomGesture = opts.onZoomGesture;
    }

    get isOpen(): boolean {
        return this.isGalleryOpen;
    }

    get scale(): number {
        return this.galleryScale;
    }

    /** Both gallery flags must be on: parent apps target the splits independently. */
    get isEnhancedGalleryEnabled(): boolean {
        const { features } = this;
        return isFeatureEnabled(features, 'galleryView.enabled') && isFeatureEnabled(features, 'galleryViewV2.enabled');
    }

    canRender(pageCount: number): boolean {
        return (
            isFeatureEnabled(this.features, 'galleryView.enabled') && pageCount > 1 && pageCount <= GALLERY_MAX_PAGES
        );
    }

    toggle = (): void => {
        this.isGalleryOpen = !this.isGalleryOpen;

        if (this.isGalleryOpen) {
            this.onBeforeOpen();
            this.applyGalleryOpenState();

            if (this.gallerySidebarTimeoutId !== null) {
                clearTimeout(this.gallerySidebarTimeoutId);
                this.gallerySidebarTimeoutId = null;
            }

            const sidebar = this.getThumbnailsSidebar();
            this.sidebarWasOpen = !!(sidebar && sidebar.isOpen);

            if (this.sidebarWasOpen) {
                this.toggleThumbnails();
                this.galleryMountTimeoutId = setTimeout(() => {
                    this.galleryMountTimeoutId = null;
                    this.mountGrid();
                }, THUMBNAILS_SIDEBAR_TRANSITION_TIME / 2);
            } else {
                this.mountGrid();
            }
        } else {
            if (this.galleryMountTimeoutId !== null) {
                clearTimeout(this.galleryMountTimeoutId);
                this.galleryMountTimeoutId = null;
            }

            const pdfViewer = this.getPdfViewer();
            const navigateToPage =
                this.galleryFocusedPage && this.galleryFocusedPage !== pdfViewer.currentPageNumber
                    ? this.galleryFocusedPage
                    : null;

            if (this.galleryRoot) {
                this.galleryRoot.unmount();
                this.galleryRoot = null;
            }

            this.clearGalleryOpenState();

            if (this.galleryEl) {
                this.galleryEl.remove();
                this.galleryEl = null;
            }

            this.galleryFocusedPage = null;

            const sidebar = this.getThumbnailsSidebar();
            if (this.sidebarWasOpen && sidebar && !sidebar.isOpen) {
                this.toggleThumbnails();
            }

            if (navigateToPage) {
                this.setPage(navigateToPage);

                if (this.sidebarWasOpen && sidebar) {
                    this.gallerySidebarTimeoutId = setTimeout(() => {
                        this.gallerySidebarTimeoutId = null;
                        sidebar.setCurrentPage(navigateToPage);
                    }, THUMBNAILS_SIDEBAR_TRANSITION_TIME);
                }
            }

            const { pickedPage } = this;
            this.pickedPage = null;
            this.onClose(pickedPage ?? navigateToPage);
        }

        this.requestUiUpdate();

        if (!this.isGalleryOpen) {
            this.onAfterClose();
            this.focusToggle();
        }
    };

    handleEscape(): boolean {
        if (!this.isGalleryOpen) return false;
        this.toggle();
        return true;
    }

    zoomIn = (): void => {
        this.commitScale(this.galleryScale + GALLERY_SCALE_STEP);
    };

    zoomOut = (): void => {
        this.commitScale(this.galleryScale - GALLERY_SCALE_STEP);
    };

    /**
     * Redirects a grid-nav key pressed outside the grid (e.g. focus parked on a toggle after
     * toggling fullscreen) into GalleryGrid so the first press navigates, like the thumbnail
     * sidebar. Keys pressed inside the grid never arrive here — GalleryGrid stops propagation
     * on every arrow/Home/End it handles.
     */
    handleArrowKey(key: string): void {
        if (!this.isGalleryOpen) return;
        if (!key.startsWith('Arrow') && key !== 'Home' && key !== 'End') return;

        this.galleryGridRef.current?.handleNavKey(key);
    }

    handleRotate(): void {
        if (this.galleryThumbnail) {
            this.galleryThumbnail.destroy();
            this.galleryThumbnail = null;
        }
    }

    destroy(): void {
        // Teardown with the gallery still open (file switch, preview closed) resolves the open
        // instead of leaving it looking abandoned. Depends on the viewer destroying this controller
        // before BaseViewer.destroy drops the metric listeners.
        if (this.isGalleryOpen) {
            this.onClose(null);
        }

        if (this.galleryMountTimeoutId !== null) {
            clearTimeout(this.galleryMountTimeoutId);
            this.galleryMountTimeoutId = null;
        }
        if (this.gallerySidebarTimeoutId !== null) {
            clearTimeout(this.gallerySidebarTimeoutId);
            this.gallerySidebarTimeoutId = null;
        }

        this.clearGalleryOpenState();

        if (this.galleryRoot) {
            this.galleryRoot.unmount();
            this.galleryRoot = null;
        }

        if (this.galleryEl) {
            this.galleryEl.remove();
            this.galleryEl = null;
        }

        if (this.galleryThumbnail) {
            this.galleryThumbnail.destroy();
            this.galleryThumbnail = null;
        }

        // Reset state so isOpen is honest even after teardown.
        this.isGalleryOpen = false;
        this.sidebarWasOpen = false;
        this.galleryFocusedPage = null;
        this.galleryScale = 1;
    }

    private applyGalleryOpenState(): void {
        this.containerEl.classList.add('bp-is-gallery-open');
        this.containerEl.querySelector('.bp-doc')?.setAttribute('inert', '');
    }

    private clearGalleryOpenState(): void {
        this.containerEl.classList.remove('bp-is-gallery-open');
        this.containerEl.querySelector('.bp-doc')?.removeAttribute('inert');
    }

    private handleGalleryNavigate = (pageNum: number): void => {
        this.galleryFocusedPage = pageNum;
        this.pickedPage = pageNum;
        this.toggle();
    };

    private handleFocusChange = (pageNum: number): void => {
        this.galleryFocusedPage = pageNum;
    };

    private commitScale = (scale: number): boolean => {
        if (!this.isEnhancedGalleryEnabled || !Number.isFinite(scale)) {
            return false;
        }

        const clamped = Math.min(GALLERY_MAX_SCALE, Math.max(GALLERY_MIN_SCALE, Math.round(scale * 1000) / 1000));
        if (clamped === this.galleryScale) {
            return false;
        }

        this.galleryScale = clamped;
        this.renderGrid();
        this.requestUiUpdate();
        return true;
    };

    // Per-page width:height ratio from PDF.js page metadata; null until the page's metadata
    // is fetched (see PdfViewerLike.getPageView), which matters for mixed-size docs.
    private getPageRatio = (pageNum: number): number | null => {
        const pdfViewer = this.getPdfViewer();
        const pageView = pdfViewer.getPageView && pdfViewer.getPageView(pageNum - 1);

        if (!pageView || !pageView.pdfPage || !pageView.viewport) {
            return null;
        }

        const { width, height } = pageView.viewport;
        return width > 0 && height > 0 ? width / height : null;
    };

    private mountGrid(): void {
        if (this.galleryRoot) {
            return;
        }

        const pdfViewer = this.getPdfViewer();

        if (!this.galleryThumbnail) {
            // Thumbnail is a JS class; cast to the typed interface used by the controller + grid.
            this.galleryThumbnail = (new Thumbnail(
                pdfViewer,
                this.getPreloader(),
            ) as unknown) as ManagedGalleryThumbnail;
        }

        this.galleryEl = document.createElement('div');
        this.galleryEl.setAttribute('data-resin-component', 'gallery');
        this.containerEl.insertBefore(this.galleryEl, this.containerEl.querySelector('.bp-ControlsRoot'));
        this.galleryRoot = createRoot(this.galleryEl);
        this.galleryFocusedPage = pdfViewer.currentPageNumber;
        this.renderGrid();
    }

    private renderGrid(): void {
        if (!this.galleryRoot || !this.galleryThumbnail) {
            return;
        }

        const pdfViewer = this.getPdfViewer();
        this.galleryRoot.render(
            <GalleryGrid
                ref={this.galleryGridRef}
                currentPage={pdfViewer.currentPageNumber}
                getPageRatio={this.getPageRatio}
                isAriaGridEnabled={this.isEnhancedGalleryEnabled}
                isPinchZoomEnabled={
                    this.isEnhancedGalleryEnabled && isFeatureEnabled(this.features, 'pinchToZoom.enabled')
                }
                isTouchZoomEnabled={this.isEnhancedGalleryEnabled && this.hasTouch}
                onClose={this.toggle}
                onFocusChange={this.handleFocusChange}
                onPageNavigate={this.handleGalleryNavigate}
                onPinchStart={this.onZoomGesture}
                onScaleChange={this.commitScale}
                pageCount={pdfViewer.pagesCount}
                scale={this.galleryScale}
                thumbnail={this.galleryThumbnail}
            />,
        );
    }
}
