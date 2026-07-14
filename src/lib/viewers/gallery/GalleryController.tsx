// Doc-viewer-bound: this controller talks to PDF.js (pdfViewer, Thumbnail) and
// the doc-specific ThumbnailsSidebar. If a non-doc viewer ever needs gallery,
// the dependencies below must be abstracted first.

import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import Thumbnail from '../../Thumbnail';
import { FeatureConfig, isFeatureEnabled } from '../../featureChecking';
import GalleryGrid, { GalleryThumbnail } from './GalleryGrid';

// Controller-owned shape: GalleryGrid only sees the read surface (GalleryThumbnail),
// but the controller also needs destroy() to invalidate the cache on rotate/teardown.
type ManagedGalleryThumbnail = GalleryThumbnail & { destroy: () => void };

const GALLERY_MAX_PAGES = 200; // Hide gallery toggle for files above this page count, will increase in V2
const THUMBNAILS_SIDEBAR_TRANSITION_TIME = 301; // ms

// Minimal local shapes for untyped peer modules (pdfjs is JS-only, sidebar is JS-only).
// Only the members the controller actually uses are declared — extend as needed.
interface PdfViewerLike {
    currentPageNumber: number;
    pagesCount: number;
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
    getPdfViewer: () => PdfViewerLike;
    getPreloader: () => PreloaderLike;
    getThumbnailsSidebar: () => ThumbnailsSidebarLike | null;
    setPage: (n: number) => void;
    toggleThumbnails: () => void;
    requestUiUpdate: () => void;
    focusToggle: () => void;
    onBeforeOpen: () => void;
    onAfterClose: () => void;
};

export default class GalleryController {
    private containerEl: HTMLElement;

    private features: FeatureConfig;

    private getPdfViewer: () => PdfViewerLike;

    private getPreloader: () => PreloaderLike;

    private getThumbnailsSidebar: () => ThumbnailsSidebarLike | null;

    private setPage: (n: number) => void;

    private toggleThumbnails: () => void;

    private requestUiUpdate: () => void;

    private focusToggle: () => void;

    private onBeforeOpen: () => void;

    private onAfterClose: () => void;

    private galleryRoot: Root | null = null;

    private galleryEl: HTMLDivElement | null = null;

    private galleryThumbnail: ManagedGalleryThumbnail | null = null;

    private galleryFocusedPage: number | null = null;

    private galleryMountTimeoutId: ReturnType<typeof setTimeout> | null = null;

    private gallerySidebarTimeoutId: ReturnType<typeof setTimeout> | null = null;

    private sidebarWasOpen = false;

    private isGalleryOpen = false;

    constructor(opts: GalleryControllerOptions) {
        this.containerEl = opts.containerEl;
        this.features = opts.features;
        this.getPdfViewer = opts.getPdfViewer;
        this.getPreloader = opts.getPreloader;
        this.getThumbnailsSidebar = opts.getThumbnailsSidebar;
        this.setPage = opts.setPage;
        this.toggleThumbnails = opts.toggleThumbnails;
        this.requestUiUpdate = opts.requestUiUpdate;
        this.focusToggle = opts.focusToggle;
        this.onBeforeOpen = opts.onBeforeOpen;
        this.onAfterClose = opts.onAfterClose;
    }

    get isOpen(): boolean {
        return this.isGalleryOpen;
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

    handleRotate(): void {
        if (this.galleryThumbnail) {
            this.galleryThumbnail.destroy();
            this.galleryThumbnail = null;
        }
    }

    destroy(): void {
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
        this.toggle();
    };

    private handleFocusChange = (pageNum: number): void => {
        this.galleryFocusedPage = pageNum;
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

        const thumbnail = this.galleryThumbnail;
        this.galleryEl = document.createElement('div');
        this.containerEl.insertBefore(this.galleryEl, this.containerEl.querySelector('.bp-ControlsRoot'));
        this.galleryRoot = createRoot(this.galleryEl);
        this.galleryFocusedPage = pdfViewer.currentPageNumber;
        this.galleryRoot.render(
            <GalleryGrid
                currentPage={pdfViewer.currentPageNumber}
                onClose={this.toggle}
                onFocusChange={this.handleFocusChange}
                onPageNavigate={this.handleGalleryNavigate}
                pageCount={pdfViewer.pagesCount}
                thumbnail={thumbnail}
            />,
        );
    }
}
