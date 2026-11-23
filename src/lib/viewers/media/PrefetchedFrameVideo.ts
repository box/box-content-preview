import noop from 'lodash/noop';
import { isTimeBuffered } from '../controls/media/utils';

// Matches shaka.net.NetworkingEngine.AdvancedRequestType.INIT_SEGMENT
const INIT_SEGMENT_REQUEST = 0;
// The previous frame stands in mid-seek only this close to the target; further away it would flash the wrong scene
const MAX_PREVIOUS_FRAME_DISTANCE_S = 1;

export type VideoStream = { codecs: string; id: number; mimeType: string; type: string };
type ResponseFilter = (
    type: number,
    response: { data: BufferSource },
    context?: { stream?: VideoStream; type?: number },
) => void;
type NetworkingEngine = {
    registerResponseFilter: (filter: ResponseFilter) => void;
    unregisterResponseFilter: (filter: ResponseFilter) => void;
};

export type Options = {
    networkingEngine: NetworkingEngine;
    /** Called once the video captures a new frame, so the caller can ask getFrame for it again */
    onFrameReady: () => void;
};

const copyBytes = (data: BufferSource): Uint8Array<ArrayBuffer> =>
    ArrayBuffer.isView(data)
        ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength).slice()
        : new Uint8Array(data).slice();

/**
 * Hidden video that the browser decodes prefetched segments into, so the seek preview can draw the real
 * frame at a time instead of a filmstrip thumbnail.
 */
export default class PrefetchedFrameVideo {
    static isSupported(): boolean {
        return typeof MediaSource === 'function';
    }

    appendQueue: Promise<void> = Promise.resolve();

    /** Stream whose init segment the source buffer last received */
    appendedInitStreamId?: number;

    /** Last frame the video finished seeking to, kept so the preview stays sharp while the next seek runs */
    frameCanvas = document.createElement('canvas');

    /** Time of the frame in frameCanvas */
    frameTime?: number;

    /** Init segments of video streams the player loaded, keyed by stream id */
    initSegments = new Map<number, Uint8Array<ArrayBuffer>>();

    mediaSource = new MediaSource();

    networkingEngine: NetworkingEngine;

    onFrameReady: () => void;

    /** Time the video was last asked to seek to, since browsers may round currentTime */
    seekTime?: number;

    /** Time the preview is likely to show next, sought to as soon as its segment is buffered */
    targetTime?: number;

    sourceBuffer?: SourceBuffer;

    sourceOpen: Promise<void>;

    videoEl = document.createElement('video');

    constructor({ networkingEngine, onFrameReady }: Options) {
        this.networkingEngine = networkingEngine;
        this.onFrameReady = onFrameReady;

        const url = URL.createObjectURL(this.mediaSource);
        this.sourceOpen = new Promise(resolve => {
            this.mediaSource.addEventListener(
                'sourceopen',
                () => {
                    URL.revokeObjectURL(url);
                    resolve();
                },
                { once: true },
            );
        });
        this.videoEl.muted = true;
        this.videoEl.src = url;
        this.videoEl.addEventListener('seeked', this.handleSeeked);

        networkingEngine.registerResponseFilter(this.storeVideoInitSegment);
    }

    destroy(): void {
        this.networkingEngine.unregisterResponseFilter(this.storeVideoInitSegment);
        this.videoEl.removeEventListener('seeked', this.handleSeeked);
        this.videoEl.removeAttribute('src');
        this.videoEl.load();
    }

    /**
     * Seeks the hidden video to a buffered time, and onFrameReady fires once its frame is captured. Until then a
     * previous frame close to the time is returned, which is closer than a filmstrip thumbnail.
     *
     * @return The last frame the video seeked to, if the time is buffered and that frame is close to it
     */
    getFrame(time: number): HTMLCanvasElement | undefined {
        this.prepareFrame(time);

        if (!isTimeBuffered(this.videoEl.buffered, time)) {
            return undefined;
        }

        const isPreviousFrameClose =
            this.frameTime !== undefined && Math.abs(this.frameTime - time) <= MAX_PREVIOUS_FRAME_DISTANCE_S;
        return isPreviousFrameClose ? this.frameCanvas : undefined;
    }

    /** Seeks ahead to a time the preview may show soon, e.g. under a resting pointer, so a click shows it at once */
    prepareFrame(time: number): void {
        this.targetTime = time;

        if (this.seekTime !== time && isTimeBuffered(this.videoEl.buffered, time)) {
            this.seekTime = time;
            this.videoEl.currentTime = time;
        }
    }

    // Chrome reports no current data mid-seek, so the frame is copied out rather than drawn from the video later
    handleSeeked = (): void => {
        const { videoHeight, videoWidth } = this.videoEl;
        const context = this.frameCanvas.getContext('2d');
        if (!context || !videoWidth || !videoHeight) {
            return;
        }

        this.frameCanvas.width = videoWidth;
        this.frameCanvas.height = videoHeight;
        context.drawImage(this.videoEl, 0, 0);
        this.frameTime = this.seekTime;
        this.onFrameReady();
    };

    storeVideoInitSegment: ResponseFilter = (type, response, context) => {
        const stream = context?.stream;
        if (context?.type === INIT_SEGMENT_REQUEST && stream?.type === 'video') {
            this.initSegments.set(stream.id, copyBytes(response.data));
        }
    };

    /**
     * @param stream - Video stream the segment belongs to
     * @param data - Segment bytes, copied because the player appends the same buffer
     * @param timestampOffset - Offset the player applies to the segment, so its frames land at the same times
     */
    addSegment = (stream: VideoStream, data: BufferSource, timestampOffset = 0): void => {
        const initSegment = this.initSegments.get(stream.id);
        if (!initSegment) {
            return;
        }

        const segment = copyBytes(data);
        this.appendQueue = this.appendQueue
            .then(async () => {
                await this.sourceOpen;
                this.sourceBuffer =
                    this.sourceBuffer ??
                    this.mediaSource.addSourceBuffer(`${stream.mimeType}; codecs="${stream.codecs}"`);

                if (this.sourceBuffer.timestampOffset !== timestampOffset) {
                    this.sourceBuffer.timestampOffset = timestampOffset;
                }
                if (this.appendedInitStreamId !== stream.id) {
                    await this.appendToSourceBuffer(initSegment);
                    this.appendedInitStreamId = stream.id;
                }
                await this.appendToSourceBuffer(segment);
                if (this.targetTime !== undefined) {
                    this.prepareFrame(this.targetTime);
                }
            })
            .catch(noop);
    };

    appendToSourceBuffer(data: Uint8Array<ArrayBuffer>): Promise<void> {
        const { sourceBuffer } = this;

        return new Promise((resolve, reject) => {
            if (!sourceBuffer) {
                reject(new Error('No source buffer to append to'));
                return;
            }
            sourceBuffer.addEventListener('updateend', () => resolve(), { once: true });
            sourceBuffer.appendBuffer(data);
        });
    }
}
