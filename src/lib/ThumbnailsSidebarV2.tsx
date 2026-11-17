import React from 'react';
import { createPortal } from 'react-dom';
import { createRoot, Root } from 'react-dom/client';
import { Ghost, Text } from '@box/blueprint-web';
import { bpRadius03 } from '@box/blueprint-web-assets/tokens/tokens';
import BlueprintProviders from './BlueprintProviders';
import ThumbnailsSidebar, { CLASS_BOX_PREVIEW_THUMBNAIL_IMAGE_LOADED } from './ThumbnailsSidebar';
import { replacePlaceholders } from './util';
import './ThumbnailsSidebarV2.scss';

const CLASS_SIDEBAR = 'bp-ThumbnailsSidebarV2';
const CLASS_ITEM = 'bp-ThumbnailsSidebarV2-item';
const CLASS_ITEM_SELECTED = 'bp-ThumbnailsSidebarV2-item--selected';
const CLASS_OVERLAY = 'bp-ThumbnailsSidebarV2-overlay';
const CLASS_PAGE = 'bp-ThumbnailsSidebarV2-page';

type ThumbnailOverlayProps = {
    pageNumber: number;
};

type Row = HTMLElement | null | undefined;

const ThumbnailOverlay = React.memo(function ThumbnailOverlay({ pageNumber }: ThumbnailOverlayProps): JSX.Element {
    return (
        <>
            <span className="bp-ThumbnailsSidebarV2-ghost">
                <Ghost
                    borderRadius={bpRadius03}
                    data-testid="bp-ThumbnailsSidebarV2-ghost"
                    height="100%"
                    variant="rectangle"
                    width="100%"
                />
            </span>
            <span className="bp-ThumbnailsSidebarV2-pageNumber">
                <Text as="span" color="textOnDarkDefault" variant="bodyDefault">
                    {`${pageNumber}`}
                </Text>
            </span>
        </>
    );
});

function setSelected(thumbnailEl: HTMLElement, isSelected: boolean): void {
    thumbnailEl.classList.toggle(CLASS_ITEM_SELECTED, isSelected);

    if (isSelected) {
        thumbnailEl.setAttribute('aria-current', 'true');
    } else {
        thumbnailEl.removeAttribute('aria-current');
    }
}

const getPageNumber = (thumbnailEl: HTMLElement): number => parseInt(thumbnailEl.dataset.bpPageNum || '', 10);

export default class ThumbnailsSidebarV2 extends ThumbnailsSidebar {
    private readonly overlayRoot: Root = createRoot(document.createElement('div'));

    private isOverlayRenderPending = false;

    private isDestroyed = false;

    constructor(element: HTMLElement, pdfViewer: unknown, preloader?: unknown) {
        super(element, pdfViewer, preloader);
        element.classList.add(CLASS_SIDEBAR);
    }

    destroy(): void {
        this.isDestroyed = true;
        this.overlayRoot.unmount();
        this.anchorEl.classList.remove(CLASS_SIDEBAR);
        super.destroy();
    }

    applyCurrentPageSelection(): void {
        this.currentThumbnails.forEach((thumbnailEl: Row) => {
            if (thumbnailEl) {
                setSelected(thumbnailEl, getPageNumber(thumbnailEl) === this.currentPage);
            }
        });
    }

    createPlaceholderThumbnail(itemIndex: number): HTMLElement {
        const pageNumber = itemIndex + 1;
        const thumbnailEl = document.createElement('div');
        thumbnailEl.className = CLASS_ITEM;
        thumbnailEl.dataset.bpPageNum = `${pageNumber}`;
        thumbnailEl.setAttribute('role', 'button');
        thumbnailEl.setAttribute('aria-label', replacePlaceholders(__('page_gallery_tile'), [`${pageNumber}`]));

        const overlayEl = document.createElement('span');
        overlayEl.className = CLASS_OVERLAY;
        overlayEl.setAttribute('aria-hidden', 'true');
        thumbnailEl.appendChild(overlayEl);

        // Must stay last: ThumbnailsSidebar appends page images to lastChild.
        const pageEl = document.createElement('div');
        pageEl.className = CLASS_PAGE;
        thumbnailEl.appendChild(pageEl);

        setSelected(thumbnailEl, pageNumber === this.currentPage);

        const cachedImage = this.thumbnail.getImageFromCache(itemIndex);
        if (cachedImage?.image && !cachedImage.inProgress) {
            pageEl.appendChild(cachedImage.image);
            thumbnailEl.classList.add(CLASS_BOX_PREVIEW_THUMBNAIL_IMAGE_LOADED);
        }

        this.currentThumbnails.push(thumbnailEl);
        this.renderOverlays();

        return thumbnailEl;
    }

    generateThumbnailImages(listInfo: { items: Row[] }): void {
        super.generateThumbnailImages(listInfo);
        this.renderOverlays();
    }

    refresh(): Promise<void> {
        const result = super.refresh();
        this.renderOverlays();
        return result;
    }

    thumbnailClickHandler(event: MouseEvent): void {
        const thumbnailEl = (event.target as Element).closest<HTMLElement>(`.${CLASS_ITEM}`);

        if (!thumbnailEl) {
            return;
        }

        if (this.onThumbnailSelect) {
            this.onThumbnailSelect(getPageNumber(thumbnailEl));
        }

        this.anchorEl.focus();

        event.preventDefault();
        event.stopImmediatePropagation();
    }

    renderOverlays(): void {
        if (this.isDestroyed || this.isOverlayRenderPending) {
            return;
        }

        this.isOverlayRenderPending = true;
        // Waits for VirtualScroller to attach the rows it is building.
        queueMicrotask(() => {
            this.isOverlayRenderPending = false;
            this.flushOverlays();
        });
    }

    private flushOverlays(): void {
        if (this.isDestroyed) {
            return;
        }

        const portals = this.currentThumbnails.map((thumbnailEl: Row) => {
            const hostEl = thumbnailEl?.isConnected && thumbnailEl.querySelector(`.${CLASS_OVERLAY}`);

            if (!thumbnailEl || !hostEl) {
                return null;
            }

            const pageNumber = getPageNumber(thumbnailEl);
            return createPortal(<ThumbnailOverlay pageNumber={pageNumber} />, hostEl, `${pageNumber}`);
        });

        this.overlayRoot.render(<BlueprintProviders container={this.anchorEl}>{portals}</BlueprintProviders>);
    }
}
