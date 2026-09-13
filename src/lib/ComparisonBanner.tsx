import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { CLASS_BOX_PREVIEW_VERSION_BANNER } from './constants';

export type ComparisonBannerFile = {
    created_by?: { name?: string };
    modified_at?: string;
    modified_by?: { name?: string };
    version_number?: string | number;
};

export type ComparisonBannerOptions = {
    isComparedPreview?: boolean;
    locale?: string;
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

export default function ComparisonBanner({ file = {}, isComparedPreview = false, locale }: Props): JSX.Element {
    const versionNumber = file.version_number != null && file.version_number !== '' ? String(file.version_number) : '';
    const timestamp = formatComparisonTimestamp(file.modified_at, locale);
    const author = getComparisonBannerAuthor(file);

    return (
        <div
            aria-label={isComparedPreview ? __('comparison_banner_previous') : __('comparison_banner_current')}
            className={CLASS_BOX_PREVIEW_VERSION_BANNER}
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
    );
}

export class ComparisonBannerRoot {
    hostEl: HTMLElement;

    root: Root;

    constructor(containerEl: HTMLElement) {
        this.hostEl = document.createElement('div');
        containerEl.insertBefore(this.hostEl, containerEl.firstChild);
        this.root = createRoot(this.hostEl);
    }

    render(file: ComparisonBannerFile = {}, { isComparedPreview = false, locale }: ComparisonBannerOptions = {}): void {
        this.root.render(<ComparisonBanner file={file} isComparedPreview={isComparedPreview} locale={locale} />);
    }

    destroy(): void {
        this.root.unmount();
        this.hostEl.remove();
    }
}
