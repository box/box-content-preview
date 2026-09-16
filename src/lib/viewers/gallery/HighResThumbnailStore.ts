export interface HighResRenderResult {
    dataUrl: string;
    height: number;
    width: number;
}

export interface HighResRenderTask {
    cancel: () => void;
    promise: Promise<HighResRenderResult | null>;
}

interface HighResThumbnailStoreOptions {
    maxBytes: number;
    maxConcurrent: number;
    maxPages: number;
    onChange: (images: Record<number, string>) => void;
    render: (pageNum: number, width: number) => HighResRenderTask;
}

interface CachedImage extends HighResRenderResult {
    bytes: number;
    requestedWidth: number;
}

interface PendingRender {
    task: HighResRenderTask;
    width: number;
}

export default class HighResThumbnailStore {
    private activeCount = 0;

    private cache = new Map<number, CachedImage>();

    private currentBytes = 0;

    private failed = new Set<number>();

    private inFlight = new Map<number, PendingRender>();

    private isDestroyed = false;

    private maxBytes: number;

    private maxConcurrent: number;

    private maxPages: number;

    private onChange: ((images: Record<number, string>) => void) | null;

    private queue: number[] = [];

    private render: ((pageNum: number, width: number) => HighResRenderTask) | null;

    private retained = new Set<number>();

    private targetWidth = 0;

    constructor({ maxBytes, maxConcurrent, maxPages, onChange, render }: HighResThumbnailStoreOptions) {
        this.maxBytes = maxBytes;
        this.maxConcurrent = maxConcurrent;
        this.maxPages = maxPages;
        this.onChange = onChange;
        this.render = render;
    }

    setRetained(pages: number[], width: number, pageRatio: number): void {
        if (this.isDestroyed) {
            return;
        }

        const previousWidth = this.targetWidth;
        this.targetWidth = width;
        if (previousWidth !== width) {
            this.failed.clear();
        }

        const ratio = Number.isFinite(pageRatio) && pageRatio > 0 ? pageRatio : 1;
        const estimatedBytes = width * Math.ceil(width / ratio) * 4;
        const pageLimit = Math.min(this.maxPages, Math.floor(this.maxBytes / estimatedBytes));
        const retainedPages = Array.from(new Set(pages)).slice(0, pageLimit);
        const retainedSet = new Set(retainedPages);
        this.retained = retainedSet;
        this.failed.forEach(pageNum => {
            if (!retainedSet.has(pageNum)) {
                this.failed.delete(pageNum);
            }
        });
        let didEvict = false;

        this.cache.forEach((entry, pageNum) => {
            if (!this.retained.has(pageNum) || entry.requestedWidth !== width) {
                this.cache.delete(pageNum);
                this.currentBytes -= entry.bytes;
                didEvict = true;
            }
        });

        this.inFlight.forEach((pending, pageNum) => {
            if (!this.retained.has(pageNum) || pending.width !== width) {
                pending.task.cancel();
                this.inFlight.delete(pageNum);
            }
        });

        this.queue = retainedPages.filter(
            pageNum => !this.cache.has(pageNum) && !this.inFlight.has(pageNum) && !this.failed.has(pageNum),
        );

        if (didEvict) {
            this.emit();
        }
        this.pump();
    }

    destroy(): void {
        if (this.isDestroyed) {
            return;
        }

        this.isDestroyed = true;
        this.inFlight.forEach(({ task }) => task.cancel());
        this.inFlight.clear();
        this.cache.clear();
        this.failed.clear();
        this.queue = [];
        this.retained.clear();
        this.currentBytes = 0;
        this.onChange = null;
        this.render = null;
    }

    private emit(): void {
        if (!this.onChange) {
            return;
        }

        const images: Record<number, string> = {};
        this.cache.forEach((entry, pageNum) => {
            images[pageNum] = entry.dataUrl;
        });
        this.onChange(images);
    }

    private pump(): void {
        if (this.isDestroyed || !this.render) {
            return;
        }

        while (this.activeCount < this.maxConcurrent && this.queue.length > 0) {
            const pageNum = this.queue.shift();
            if (pageNum && this.retained.has(pageNum)) {
                this.startRender(pageNum);
            }
        }
    }

    private startRender(pageNum: number): void {
        if (!this.render) {
            return;
        }

        const width = this.targetWidth;
        let task: HighResRenderTask;
        try {
            task = this.render(pageNum, width);
        } catch {
            this.failed.add(pageNum);
            return;
        }

        const pending = { task, width };
        this.activeCount += 1;
        this.inFlight.set(pageNum, pending);

        task.promise
            .then(
                result => this.handleRenderResult(pageNum, pending, result),
                () => this.handleRenderFailure(pageNum, pending),
            )
            .then(
                () => this.finishRender(),
                () => this.finishRender(),
            );
    }

    private clearInFlight(pageNum: number, pending: PendingRender): boolean {
        if (this.inFlight.get(pageNum) !== pending) {
            return false;
        }

        this.inFlight.delete(pageNum);
        return true;
    }

    private finishRender(): void {
        this.activeCount -= 1;
        this.pump();
    }

    private handleRenderFailure(pageNum: number, pending: PendingRender): void {
        if (this.clearInFlight(pageNum, pending) && this.isStillWanted(pageNum, pending)) {
            this.failed.add(pageNum);
        }
    }

    private handleRenderResult(pageNum: number, pending: PendingRender, result: HighResRenderResult | null): void {
        if (!this.clearInFlight(pageNum, pending) || !result || !this.isStillWanted(pageNum, pending)) {
            return;
        }

        const { height, width } = result;
        if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
            this.failed.add(pageNum);
            return;
        }

        const bytes = width * height * 4;
        const existing = this.cache.get(pageNum);
        const nextBytes = this.currentBytes - (existing?.bytes || 0) + bytes;
        if (nextBytes > this.maxBytes) {
            this.failed.add(pageNum);
            return;
        }

        this.cache.set(pageNum, { ...result, bytes, requestedWidth: pending.width });
        this.currentBytes = nextBytes;
        this.emit();
    }

    private isStillWanted(pageNum: number, pending: PendingRender): boolean {
        return !this.isDestroyed && this.targetWidth === pending.width && this.retained.has(pageNum);
    }
}
