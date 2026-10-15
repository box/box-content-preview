import React from 'react';
import { createRoot, Root } from 'react-dom/client';

import { DropdownMenu, IconButton } from '@box/blueprint-web';
import Checkmark from '@box/blueprint-web-assets/icons/Medium/Checkmark';
import Download from '@box/blueprint-web-assets/icons/Medium/Download';
import Ellipsis from '@box/blueprint-web-assets/icons/Medium/Ellipsis';
import Expand from '@box/blueprint-web-assets/icons/Medium/Expand';
import Trash from '@box/blueprint-web-assets/icons/Medium/Trash';

import BlueprintProviders from './BlueprintProviders';
import { CLASS_BOX_PREVIEW_VERSION_BANNER, CLASS_BOX_PREVIEW_VERSION_BANNER_COMPARED } from './constants';

export type ComparisonBannerFile = {
    created_by?: { name?: string };
    modified_at?: string;
    modified_by?: { name?: string };
    version_number?: string | number;
};

export type ComparisonBannerOptions = {
    isComparedPreview?: boolean;
    locale?: string;
    menuContainer?: HTMLElement | null;
    onDelete?: () => void;
    onDownload?: () => void;
    onMakeCurrent?: () => void;
    onOpenFullPreview?: () => void;
};

type Props = ComparisonBannerOptions & {
    file?: ComparisonBannerFile;
};

export function formatComparisonTimestamp(iso?: string, locale?: string): string {
    if (!iso) {
        return '';
    }

    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return new Intl.DateTimeFormat(locale || 'en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(date);
}

export function getComparisonBannerAuthor(file: ComparisonBannerFile = {}): string {
    return file.modified_by?.name || file.created_by?.name || '';
}

export default function ComparisonBanner({
    file = {},
    isComparedPreview = false,
    locale,
    menuContainer,
    onDelete,
    onDownload,
    onMakeCurrent,
    onOpenFullPreview,
}: Props): JSX.Element | null {
    const versionNumber = file.version_number != null && file.version_number !== '' ? String(file.version_number) : '';
    const timestamp = formatComparisonTimestamp(file.modified_at, locale);
    const author = getComparisonBannerAuthor(file);

    if (!versionNumber && !timestamp && !author) {
        return null;
    }

    return (
        <div
            className={
                isComparedPreview
                    ? `${CLASS_BOX_PREVIEW_VERSION_BANNER} ${CLASS_BOX_PREVIEW_VERSION_BANNER_COMPARED}`
                    : CLASS_BOX_PREVIEW_VERSION_BANNER
            }
        >
            <div
                aria-label={isComparedPreview ? __('comparison_banner_previous') : __('comparison_banner_current')}
                className="bp-version-banner-details"
                role="status"
            >
                {versionNumber && <span className="bp-version-banner-badge">{versionNumber}</span>}
                {(timestamp || author) && (
                    <div className="bp-version-banner-info">
                        {timestamp && <div className="bp-version-banner-time">{timestamp}</div>}
                        {author && <div className="bp-version-banner-author">{author}</div>}
                    </div>
                )}
            </div>
            {isComparedPreview && (onMakeCurrent || onDownload || onOpenFullPreview || onDelete) && (
                <div className="bp-version-banner-actions">
                    <BlueprintProviders container={menuContainer}>
                        <DropdownMenu.Root>
                            <DropdownMenu.Trigger asChild>
                                <IconButton
                                    aria-label={__('comparison_banner_actions')}
                                    data-target-id="ComparisonBanner-openActions"
                                    icon={Ellipsis}
                                    size="small"
                                />
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Content align="end" container={menuContainer ?? undefined} side="bottom">
                                {onMakeCurrent && (
                                    <DropdownMenu.Item
                                        data-target-id="ComparisonBanner-makeCurrent"
                                        onSelect={onMakeCurrent}
                                    >
                                        <DropdownMenu.Item.StartElement icon={Checkmark} />
                                        <DropdownMenu.Item.MainContent label={__('comparison_banner_make_current')} />
                                    </DropdownMenu.Item>
                                )}
                                {onDownload && (
                                    <DropdownMenu.Item data-target-id="ComparisonBanner-download" onSelect={onDownload}>
                                        <DropdownMenu.Item.StartElement icon={Download} />
                                        <DropdownMenu.Item.MainContent label={__('download')} />
                                    </DropdownMenu.Item>
                                )}
                                {onOpenFullPreview && (
                                    <DropdownMenu.Item
                                        data-target-id="ComparisonBanner-openFullPreview"
                                        onSelect={onOpenFullPreview}
                                    >
                                        <DropdownMenu.Item.StartElement icon={Expand} />
                                        <DropdownMenu.Item.MainContent
                                            label={__('comparison_banner_open_full_preview')}
                                        />
                                    </DropdownMenu.Item>
                                )}
                                {onDelete && (onMakeCurrent || onDownload || onOpenFullPreview) && (
                                    <DropdownMenu.Separator />
                                )}
                                {onDelete && (
                                    <DropdownMenu.Item
                                        data-target-id="ComparisonBanner-delete"
                                        onSelect={onDelete}
                                        variant="destructive"
                                    >
                                        <DropdownMenu.Item.StartElement icon={Trash} />
                                        <DropdownMenu.Item.MainContent label={__('comparison_banner_delete')} />
                                    </DropdownMenu.Item>
                                )}
                            </DropdownMenu.Content>
                        </DropdownMenu.Root>
                    </BlueprintProviders>
                </div>
            )}
        </div>
    );
}

export class ComparisonBannerRoot {
    containerEl: HTMLElement;

    hostEl: HTMLElement;

    root: Root;

    constructor(containerEl: HTMLElement) {
        this.containerEl = containerEl;
        this.hostEl = document.createElement('div');
        containerEl.insertBefore(this.hostEl, containerEl.firstChild);
        this.root = createRoot(this.hostEl);
    }

    render(file: ComparisonBannerFile = {}, options: ComparisonBannerOptions = {}): void {
        const { isComparedPreview = false, locale, menuContainer, onDelete, onDownload, onMakeCurrent, onOpenFullPreview } =
            options;

        this.root.render(
            <ComparisonBanner
                file={file}
                isComparedPreview={isComparedPreview}
                locale={locale}
                menuContainer={menuContainer ?? this.containerEl}
                onDelete={onDelete}
                onDownload={onDownload}
                onMakeCurrent={onMakeCurrent}
                onOpenFullPreview={onOpenFullPreview}
            />,
        );
    }

    destroy(): void {
        this.root.unmount();
        this.hostEl.remove();
    }
}
