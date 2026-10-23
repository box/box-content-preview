import React from 'react';
import { createRoot, Root } from 'react-dom/client';

import { DropdownMenu, EllipsizableText, IconButton, Tooltip } from '@box/blueprint-web';
import { Checkmark, Download, Ellipsis, Expand, Trash, XMark } from '@box/blueprint-web-assets/icons/Medium';

import BlueprintProviders from './BlueprintProviders';
import { CLASS_BOX_PREVIEW_VERSION_BANNER, CLASS_BOX_PREVIEW_VERSION_BANNER_COMPARED } from './constants';
import { replacePlaceholders } from './util';

import './ComparisonBanner.scss';

// The badge is a fixed-size circle, so larger version numbers are shown as "999+"
export const MAX_BADGE_VERSION = 999;

export type ComparisonBannerFile = {
    created_by?: { name?: string };
    modified_at?: string;
    modified_by?: { name?: string };
    version_number?: string | number;
};

export type ComparisonBannerOptions = {
    isComparedPreview?: boolean;
    isOnDark?: boolean;
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

function VersionBadge({
    fullLabel,
    isTruncated,
    label,
}: {
    fullLabel: string;
    isTruncated: boolean;
    label: string;
}): JSX.Element {
    const badge = (
        <span
            aria-label={fullLabel}
            className={
                isTruncated ? 'bp-version-banner-badge bp-version-banner-badge--truncated' : 'bp-version-banner-badge'
            }
            role="img"
            // The tooltip already shows the full label when truncated, so skip the native title then
            title={isTruncated ? undefined : fullLabel}
        >
            {label}
        </span>
    );

    return isTruncated ? <Tooltip content={fullLabel}>{badge}</Tooltip> : badge;
}

export default function ComparisonBanner({
    file = {},
    isComparedPreview = false,
    isOnDark = false,
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
    const isBadgeTruncated = Number(versionNumber) > MAX_BADGE_VERSION;
    const badgeLabel = isBadgeTruncated ? `${MAX_BADGE_VERSION}+` : versionNumber;
    const badgeFullLabel = replacePlaceholders(__('comparison_banner_version'), [versionNumber]);
    // When "Open Full Preview" is the only action, the close button covers it, so skip the menu
    const showMenu = !!(onMakeCurrent || onDownload || onDelete);
    const showClose = !!onOpenFullPreview;

    if (!versionNumber && !timestamp && !author) {
        return null;
    }

    return (
        <BlueprintProviders container={menuContainer}>
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
                    {versionNumber && (
                        <VersionBadge fullLabel={badgeFullLabel} isTruncated={isBadgeTruncated} label={badgeLabel} />
                    )}
                    {(timestamp || author) && (
                        <div className="bp-version-banner-info">
                            {timestamp && (
                                <EllipsizableText
                                    as="div"
                                    className="bp-version-banner-time"
                                    lineClamp={1}
                                    variant="bodyDefaultSemibold"
                                >
                                    {timestamp}
                                </EllipsizableText>
                            )}
                            {author && (
                                <EllipsizableText
                                    as="div"
                                    className="bp-version-banner-author"
                                    lineClamp={1}
                                    variant="caption"
                                >
                                    {author}
                                </EllipsizableText>
                            )}
                        </div>
                    )}
                </div>
                {isComparedPreview && (onMakeCurrent || onDownload || onOpenFullPreview || onDelete) && (
                    <div
                        className="bp-version-banner-actions"
                        onKeyDown={(event: React.KeyboardEvent): void => {
                            event.stopPropagation(); // Prevents global key handling
                        }}
                        role="presentation"
                    >
                        {showMenu && (
                            <DropdownMenu.Root>
                                <DropdownMenu.Trigger asChild>
                                    <IconButton
                                        aria-label={__('comparison_banner_actions')}
                                        data-target-id="ComparisonBanner-openActions"
                                        icon={Ellipsis}
                                        size="small"
                                        variant={isOnDark ? 'on-dark' : 'default'}
                                    />
                                </DropdownMenu.Trigger>
                                <DropdownMenu.Content align="end" container={menuContainer ?? undefined} side="bottom">
                                    {onMakeCurrent && (
                                        <DropdownMenu.Item
                                            data-target-id="ComparisonBanner-makeCurrent"
                                            onSelect={onMakeCurrent}
                                        >
                                            <DropdownMenu.Item.StartElement icon={Checkmark} />
                                            <DropdownMenu.Item.MainContent
                                                label={__('comparison_banner_make_current')}
                                            />
                                        </DropdownMenu.Item>
                                    )}
                                    {onDownload && (
                                        <DropdownMenu.Item
                                            data-target-id="ComparisonBanner-download"
                                            onSelect={onDownload}
                                        >
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
                        )}
                        {showMenu && showClose && <span aria-hidden="true" className="bp-version-banner-divider" />}
                        {showClose && (
                            <IconButton
                                aria-label={__('comparison_banner_close')}
                                data-target-id="ComparisonBanner-close"
                                icon={XMark}
                                onClick={onOpenFullPreview}
                                size="small"
                                variant={isOnDark ? 'on-dark' : 'default'}
                            />
                        )}
                    </div>
                )}
            </div>
        </BlueprintProviders>
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
        const {
            isComparedPreview = false,
            isOnDark,
            locale,
            menuContainer,
            onDelete,
            onDownload,
            onMakeCurrent,
            onOpenFullPreview,
        } = options;

        this.root.render(
            <ComparisonBanner
                file={file}
                isComparedPreview={isComparedPreview}
                isOnDark={isOnDark}
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
