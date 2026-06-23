import React from 'react';
import IconArrowsMaximizeMedium24 from '../icons/IconArrowsMaximizeMedium24';
import IconArrowsMinimizeMedium24 from '../icons/IconArrowsMinimizeMedium24';
import useFullscreen from '../hooks/useFullscreen';
import './VideoFullscreenButton.scss';

export type Props = {
    mediaEl?: HTMLVideoElement | null;
    onFullscreenToggle: (isFullscreen: boolean, toggleFullscreenEl: EventTarget | null) => void;
};

export default function VideoFullscreenButton({ mediaEl, onFullscreenToggle }: Props): JSX.Element {
    const isFullscreen = useFullscreen();
    const title = isFullscreen ? __('exit_fullscreen') : __('enter_fullscreen');
    const ref = React.useRef<HTMLButtonElement>(null);
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

        const resizeObserver = new ResizeObserver(update);
        resizeObserver.observe(mediaEl);
        window.addEventListener('resize', update);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', update);
        };
    }, [mediaEl]);

    const handleClick = ({ target }: React.MouseEvent): void => {
        onFullscreenToggle(!isFullscreen, target);
    };

    return (
        <button
            ref={ref}
            className="bp-VideoFullscreenButton"
            onClick={handleClick}
            style={position ? { top: position.top, right: position.right } : undefined}
            title={title}
            type="button"
        >
            {isFullscreen ? <IconArrowsMinimizeMedium24 /> : <IconArrowsMaximizeMedium24 />}
        </button>
    );
}
