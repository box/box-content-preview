/* eslint-disable @typescript-eslint/no-explicit-any */
// Hand-written type declarations for the legacy Preview class.
// Loose typing for v1; tighten in follow-ups as consumer feedback comes in.

export type BoxToken = string | ((fileIds: string | string[]) => Promise<string | Record<string, string>>);

export interface BoxFile {
    id: string;
    type?: string;
    name?: string;
    extension?: string;
    size?: number;
    [key: string]: unknown;
}

export type PreviewEventName =
    | 'load'
    | 'preview_error'
    | 'preview_metric'
    | 'navigate'
    | 'viewer'
    | 'preload'
    | 'progressstart'
    | 'progressend'
    | 'thumbnailsOpen'
    | 'thumbnailsClose'
    | 'annotator_create'
    | string;

export type PreviewEventListener = (data?: any) => void;

export interface ComparisonBannerFile {
    created_by?: { name?: string };
    modified_at?: string;
    modified_by?: { name?: string };
    version_number?: string | number;
}

/** Both panes get the same object; compared pane uses previousFileVersion. */
export interface ComparisonBannerVersions {
    currentFileVersion?: ComparisonBannerFile;
    previousFileVersion?: ComparisonBannerFile;
}

/** Partial update; only provided flags change. isComparedPreview implies isComparing. */
export interface ComparisonMode {
    /** In a comparison (not “current pane”). Current = isComparing && !isComparedPreview. */
    isComparing?: boolean;
    /** Compared (previous version) pane. */
    isComparedPreview?: boolean;
}

export interface PreviewOptions {
    apiHost?: string;
    appHost?: string;
    autoFocus?: boolean;
    boxAnnotations?: any;
    cache?: { inMemoryOnly?: boolean };
    collection?: Array<string | BoxFile>;
    comparisonBanner?: ComparisonBannerVersions;
    container?: string | HTMLElement;
    enableAnnotationsImageDiscoverability?: boolean;
    enableThumbnailsSidebar?: boolean;
    fileOptions?: Record<string, Record<string, unknown>>;
    fixDependencies?: boolean;
    header?: 'light' | 'dark' | 'none';
    headerElement?: HTMLElement;
    /** Compared (previous version) pane; implies isComparing. */
    isComparedPreview?: boolean;
    /** In a comparison (not “current pane”). */
    isComparing?: boolean;
    location?: { staticBaseURI?: string; version?: string; locale?: string };
    logoUrl?: string;
    pauseRequireJS?: boolean;
    pdfjs?: { workerSrc?: string };
    previewWMPref?: string;
    requestInterceptor?: (config: unknown) => unknown;
    responseInterceptor?: (response: unknown) => unknown;
    sharedLink?: string;
    sharedLinkPassword?: string;
    showAnnotations?: boolean;
    showAnnotationsControls?: boolean;
    showAnnotationsDiscoverability?: boolean;
    showAnnotationsDrawingCreate?: boolean;
    showAnnotationsImageDiscoverability?: boolean;
    showAnnotationsOnlyControls?: boolean;
    showDownload?: boolean;
    showLoading?: boolean;
    showProgress?: boolean;
    skipServerUpdate?: boolean;
    staticBaseURI?: string;
    staticHost?: string;
    token?: BoxToken;
    useHotkeys?: boolean;
    viewer?: { NAME: string };
    viewers?: Record<string, { disabled?: boolean; viewerOptions?: Record<string, unknown> }>;
    [key: string]: unknown;
}

export interface PreviewError {
    code: string;
    message: string;
    displayMessage?: string;
    details?: Record<string, unknown>;
}

export class Preview {
    constructor();

    destroy(): void;

    show(fileIdOrFile: string | BoxFile, token: BoxToken, options?: PreviewOptions): void;

    hide(): void;

    setComparisonMode(mode?: ComparisonMode): void;

    reload(skipServerUpdate?: boolean): void;

    resize(): void;

    print(): void;

    canPrint(): boolean;

    download(): void;

    updateToken(tokenOrTokenFunc: BoxToken, reload?: boolean): void;

    updateCollection(collection: Array<string | BoxFile>): void;

    updateFileCache(fileMetadata?: BoxFile[]): void;

    getCurrentViewer(): unknown;

    getCurrentFile(): BoxFile | null;

    getCurrentCollection(): Array<string | BoxFile>;

    getViewers(): Array<{ NAME: string; CONSTRUCTOR: unknown }>;

    enableViewers(viewers?: string | string[]): void;

    disableViewers(viewers?: string | string[]): void;

    enableHotkeys(): void;

    disableHotkeys(): void;

    prefetchViewers(viewerNames?: string[]): void;

    loadViewers(viewerNames?: string[]): void;

    navigateLeft(): void;

    navigateRight(): void;

    setAnnotatorViewMode(viewMode: string): void;

    showBoundingBoxHighlights(boundingBoxes?: Array<unknown>): void;

    hideBoundingBoxHighlights(): void;

    addListener(event: PreviewEventName, listener: PreviewEventListener): this;

    removeListener(event: PreviewEventName, listener: PreviewEventListener): this;

    on(event: PreviewEventName, listener: PreviewEventListener): this;

    off(event: PreviewEventName, listener: PreviewEventListener): this;

    once(event: PreviewEventName, listener: PreviewEventListener): this;

    emit(event: PreviewEventName, ...args: any[]): boolean;
}

export default Preview;
