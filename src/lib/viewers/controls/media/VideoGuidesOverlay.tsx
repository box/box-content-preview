import React from 'react';
import { Guide } from './MediaSettingsMenuGuides';
import './VideoGuidesOverlay.scss';

export type Props = {
    guide: Guide;
    isMaskEnabled: boolean;
    mediaEl: HTMLVideoElement;
};

const GUIDE_RATIO_MAP: Partial<Record<Guide, number>> = {
    [Guide.R_16_9]: 16 / 9,
    [Guide.R_9_16]: 9 / 16,
    [Guide.R_1_1]: 1,
    [Guide.R_4_5]: 4 / 5,
    [Guide.R_2_39_1]: 2.39,
    [Guide.R_2_1]: 2,
    [Guide.R_1_85_1]: 1.85,
    [Guide.R_2_35_1]: 2.35,
    [Guide.R_4_3]: 4 / 3,
    [Guide.R_21_9]: 21 / 9,
};

const ACTION_SAFE_RATIO = 0.93; // SMPTE ST 2046-1 / EBU R95 / ARIB TR-B4

type Box = { height: number; left: number; top: number; width: number };

// Measure where the <video> element's box sits inside the overlay's
// offsetParent. The SVG content does its own letterboxing via
// preserveAspectRatio so we don't need to know where the painted video is —
// only where the element box is.
function getVideoBox(mediaEl: HTMLVideoElement, offsetParent: Element | null): Box | null {
    if (!offsetParent) return null;

    const videoBox = mediaEl.getBoundingClientRect();
    const parentBox = offsetParent.getBoundingClientRect();

    if (!videoBox.width || !videoBox.height) return null;

    return {
        height: videoBox.height,
        left: videoBox.left - parentBox.left,
        top: videoBox.top - parentBox.top,
        width: videoBox.width,
    };
}

export default function VideoGuidesOverlay({ guide, isMaskEnabled, mediaEl }: Props): JSX.Element | null {
    const rootRef = React.useRef<HTMLDivElement>(null);
    const [box, setBox] = React.useState<Box | null>(null);
    const [videoSize, setVideoSize] = React.useState<{ height: number; width: number } | null>(null);

    React.useEffect(() => {
        const updateBox = (): void => setBox(getVideoBox(mediaEl, rootRef.current?.offsetParent ?? null));
        const updateVideoSize = (): void => {
            if (mediaEl.videoWidth && mediaEl.videoHeight) {
                setVideoSize({ height: mediaEl.videoHeight, width: mediaEl.videoWidth });
            }
        };

        updateBox();
        updateVideoSize();

        const resizeObserver = new ResizeObserver(updateBox);
        resizeObserver.observe(mediaEl);
        if (rootRef.current?.offsetParent) {
            resizeObserver.observe(rootRef.current.offsetParent);
        }
        mediaEl.addEventListener('loadedmetadata', updateVideoSize);
        window.addEventListener('resize', updateBox);

        return () => {
            resizeObserver.disconnect();
            mediaEl.removeEventListener('loadedmetadata', updateVideoSize);
            window.removeEventListener('resize', updateBox);
        };
    }, [mediaEl]);

    const guideAspect = GUIDE_RATIO_MAP[guide];

    if (!box || !videoSize || !guideAspect) {
        return <div ref={rootRef} className="bp-VideoGuidesOverlay" data-testid="bp-VideoGuidesOverlay" />;
    }

    // SVG viewBox matches the video's intrinsic aspect ratio. With
    // preserveAspectRatio="xMidYMid meet" the SVG letterboxes itself the same
    // way the <video> element does, so SVG coordinates always align with the
    // painted video — no DOM measurement of the painted area required.
    const vbWidth = videoSize.width;
    const vbHeight = videoSize.height;
    const videoAspect = vbWidth / vbHeight;

    // Fit a centered rect of `guideAspect` inside the viewBox.
    let frameWidth: number;
    let frameHeight: number;
    if (guideAspect > videoAspect) {
        frameWidth = vbWidth;
        frameHeight = vbWidth / guideAspect;
    } else {
        frameHeight = vbHeight;
        frameWidth = vbHeight * guideAspect;
    }
    const frameX = (vbWidth - frameWidth) / 2;
    const frameY = (vbHeight - frameHeight) / 2;

    const safeWidth = frameWidth * ACTION_SAFE_RATIO;
    const safeHeight = frameHeight * ACTION_SAFE_RATIO;
    const safeX = frameX + (frameWidth - safeWidth) / 2;
    const safeY = frameY + (frameHeight - safeHeight) / 2;

    const maskId = `bp-VideoGuidesOverlay-mask-${guide}`;

    return (
        <div
            ref={rootRef}
            className="bp-VideoGuidesOverlay"
            data-testid="bp-VideoGuidesOverlay"
            style={{ top: box.top, left: box.left, width: box.width, height: box.height }}
        >
            <svg
                className="bp-VideoGuidesOverlay-svg"
                preserveAspectRatio="xMidYMid meet"
                viewBox={`0 0 ${vbWidth} ${vbHeight}`}
                xmlns="http://www.w3.org/2000/svg"
            >
                {isMaskEnabled && (
                    <>
                        <defs>
                            <mask id={maskId}>
                                <rect fill="white" height={vbHeight} width={vbWidth} x={0} y={0} />
                                <rect fill="black" height={frameHeight} width={frameWidth} x={frameX} y={frameY} />
                            </mask>
                        </defs>
                        <rect
                            data-testid="bp-VideoGuidesOverlay-mask"
                            fill="#000"
                            height={vbHeight}
                            mask={`url(#${maskId})`}
                            width={vbWidth}
                            x={0}
                            y={0}
                        />
                    </>
                )}
                {/* Frame: dark casing under white line for legibility on light/dark footage */}
                <rect
                    className="bp-VideoGuidesOverlay-cas"
                    data-testid="bp-VideoGuidesOverlay-frame"
                    height={frameHeight}
                    width={frameWidth}
                    x={frameX}
                    y={frameY}
                />
                <rect
                    className="bp-VideoGuidesOverlay-ln"
                    height={frameHeight}
                    width={frameWidth}
                    x={frameX}
                    y={frameY}
                />
                {/* Action-safe (93% inset) */}
                <rect
                    className="bp-VideoGuidesOverlay-cas"
                    data-testid="bp-VideoGuidesOverlay-action-safe"
                    height={safeHeight}
                    width={safeWidth}
                    x={safeX}
                    y={safeY}
                />
                <rect className="bp-VideoGuidesOverlay-ln" height={safeHeight} width={safeWidth} x={safeX} y={safeY} />
            </svg>
        </div>
    );
}
