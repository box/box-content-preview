import React from 'react';
import IconFullscreenIn24 from '../icons/IconFullscreenIn24';
import IconFullscreenOut24 from '../icons/IconFullscreenOut24';
import useFullscreen from '../hooks/useFullscreen';
import './FullscreenToggle.scss';

export type Props = {
    onFullscreenToggle: (isFullscreen: boolean) => void;
};

export default function FullscreenToggle({ onFullscreenToggle }: Props): JSX.Element {
    const isFullscreen = useFullscreen();
    const Icon = isFullscreen ? IconFullscreenOut24 : IconFullscreenIn24;
    const title = isFullscreen ? __('exit_fullscreen') : __('enter_fullscreen');

    const handleClick = (): void => {
        onFullscreenToggle(!isFullscreen);
    };

    return (
        <button className="bp-FullscreenToggle" onClick={handleClick} title={title} type="button">
            <Icon />
        </button>
    );
}
