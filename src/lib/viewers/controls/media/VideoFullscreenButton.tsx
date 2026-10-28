import React from 'react';
import { IconButton, Tooltip } from '@box/blueprint-web';
import { ArrowsMaximize, ArrowsMinimize } from '@box/blueprint-web-assets/icons/Medium';
import IconArrowsMaximizeMedium24 from '../icons/IconArrowsMaximizeMedium24';
import IconArrowsMinimizeMedium24 from '../icons/IconArrowsMinimizeMedium24';
import { stopActivationKeyPropagation } from './utils';
import useFullscreen from '../hooks/useFullscreen';
import './VideoFullscreenButton.scss';

export type Props = {
    mediaEl?: HTMLVideoElement | null;
    onFullscreenToggle: (isFullscreen: boolean, toggleFullscreenEl: EventTarget | null) => void;
    isBlueprintEnabled?: boolean;
};

function isFocusVisible(el: Element | null): boolean {
    try {
        return !!el?.matches(':focus-visible');
    } catch {
        return true;
    }
}

export default function VideoFullscreenButton({
    mediaEl,
    onFullscreenToggle,
    isBlueprintEnabled = false,
}: Props): JSX.Element {
    const isFullscreen = useFullscreen();
    const title = isFullscreen ? __('exit_fullscreen') : __('enter_fullscreen');
    const ref = React.useRef<HTMLElement>(null);
    const [position, setPosition] = React.useState<{ top: number; right: number } | null>(null);
    const [isTooltipOpen, setIsTooltipOpen] = React.useState(false);
    const isHoveredRef = React.useRef(false);

    React.useEffect(() => {
        if (!mediaEl) return undefined;

        const observed: { observer?: ResizeObserver; parent?: Element } = {};

        const update = (): void => {
            const parent = ref.current?.offsetParent;
            if (!parent) return;

            if (parent !== observed.parent) {
                if (observed.parent) {
                    observed.observer?.unobserve(observed.parent);
                }
                observed.parent = parent;
                observed.observer?.observe(parent);
            }

            const videoRect = mediaEl.getBoundingClientRect();
            const parentRect = parent.getBoundingClientRect();

            setPosition({
                top: videoRect.top - parentRect.top + 24,
                right: parentRect.right - videoRect.right + 24,
            });
        };

        // Watch both the video and the overlay parent. A sibling layout change
        // (e.g. a host-page sidebar) can shrink the parent and re-center the
        // video without changing the video element's box size, so observing
        // mediaEl alone would leave the button at a stale `right` offset.
        // The button is watched too: it has no offsetParent while the preview is hidden during load, and the
        // video can reach its final size before then, so the button appearing may be the only signal left.
        const resizeObserver = new ResizeObserver(update);
        observed.observer = resizeObserver;
        resizeObserver.observe(mediaEl);
        if (ref.current) {
            resizeObserver.observe(ref.current);
        }
        update();
        window.addEventListener('resize', update);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', update);
        };
    }, [mediaEl]);

    const handleClick = ({ target }: React.MouseEvent): void => {
        onFullscreenToggle(!isFullscreen, target);
    };

    // The viewer refocuses this button after a fullscreen change, mid-relayout. Show the tooltip for
    // hover or keyboard focus only, not for that refocus after a mouse click.
    const handleTooltipOpenChange = (open: boolean): void => {
        if (open && !isHoveredRef.current && !isFocusVisible(document.activeElement)) return;
        setIsTooltipOpen(open);
    };

    const positionStyle = position ? { top: position.top, right: position.right } : undefined;

    if (isBlueprintEnabled) {
        return (
            <div
                ref={ref as React.RefObject<HTMLDivElement>}
                className="bp-VideoFullscreenButton-position"
                onPointerEnter={() => {
                    isHoveredRef.current = true;
                }}
                onPointerLeave={() => {
                    isHoveredRef.current = false;
                }}
                style={positionStyle}
            >
                <Tooltip content={title} onOpenChange={handleTooltipOpenChange} open={isTooltipOpen}>
                    <IconButton
                        aria-label={title}
                        data-resin-target="videoFullscreen"
                        data-target-id="VideoFullscreenButton-toggle"
                        icon={isFullscreen ? ArrowsMinimize : ArrowsMaximize}
                        onClick={handleClick}
                        onKeyDown={stopActivationKeyPropagation}
                        size="large"
                        variant="on-dark"
                    />
                </Tooltip>
            </div>
        );
    }

    return (
        <button
            ref={ref as React.RefObject<HTMLButtonElement>}
            className="bp-VideoFullscreenButton"
            data-resin-target="videoFullscreen"
            onClick={handleClick}
            style={positionStyle}
            title={title}
            type="button"
        >
            {isFullscreen ? <IconArrowsMinimizeMedium24 /> : <IconArrowsMaximizeMedium24 />}
        </button>
    );
}
