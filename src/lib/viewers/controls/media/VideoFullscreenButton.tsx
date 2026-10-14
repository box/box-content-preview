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

export default function VideoFullscreenButton({
    mediaEl,
    onFullscreenToggle,
    isBlueprintEnabled = false,
}: Props): JSX.Element {
    const isFullscreen = useFullscreen();
    const title = isFullscreen ? __('exit_fullscreen') : __('enter_fullscreen');
    const ref = React.useRef<HTMLElement>(null);
    const [position, setPosition] = React.useState<{ top: number; right: number } | null>(null);

    React.useEffect(() => {
        if (!mediaEl) return undefined;

        const update = (): void => {
            const parent = ref.current?.offsetParent;
            if (!parent) return;

            const videoRect = mediaEl.getBoundingClientRect();
            const parentRect = parent.getBoundingClientRect();

            setPosition({
                top: videoRect.top - parentRect.top + 24,
                right: parentRect.right - videoRect.right + 24,
            });
        };

        update();

        // Watch both the video and the overlay parent. A sibling layout change
        // (e.g. a host-page sidebar) can shrink the parent and re-center the
        // video without changing the video element's box size, so observing
        // mediaEl alone would leave the button at a stale `right` offset.
        const resizeObserver = new ResizeObserver(update);
        resizeObserver.observe(mediaEl);
        if (ref.current?.offsetParent) {
            resizeObserver.observe(ref.current.offsetParent);
        }
        window.addEventListener('resize', update);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', update);
        };
    }, [mediaEl]);

    const handleClick = ({ target }: React.MouseEvent): void => {
        onFullscreenToggle(!isFullscreen, target);
    };

    const positionStyle = position ? { top: position.top, right: position.right } : undefined;

    if (isBlueprintEnabled) {
        return (
            <div
                ref={ref as React.RefObject<HTMLDivElement>}
                className="bp-VideoFullscreenButton-position"
                style={positionStyle}
            >
                <Tooltip content={title}>
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
