import React from 'react';
import fullscreen from '../../../Fullscreen';
import IconFullscreenIn24 from '../icons/IconFullscreenIn24';
import IconFullscreenOut24 from '../icons/IconFullscreenOut24';
import './FullscreenToggle.scss';

export type Props = {
    onFullscreenToggle: (isFullscreen: boolean) => void;
};

export default function FullscreenToggle({ onFullscreenToggle }: Props): JSX.Element {
    const [isFullscreen, setFullscreen] = React.useState(false);
    const Icon = isFullscreen ? IconFullscreenOut24 : IconFullscreenIn24;
    const title = isFullscreen ? __('exit_fullscreen') : __('enter_fullscreen');

    const handleClick = (): void => {
        onFullscreenToggle(!isFullscreen);
    };

    React.useEffect(() => {
        const handleFullscreenEnter = (): void => setFullscreen(true);
        const handleFullscreenExit = (): void => setFullscreen(false);

        fullscreen.addListener('enter', handleFullscreenEnter);
        fullscreen.addListener('exit', handleFullscreenExit);

        return (): void => {
            fullscreen.removeListener('enter', handleFullscreenEnter);
            fullscreen.removeListener('exit', handleFullscreenExit);
        };
    }, []);

    return (
        <button className="bp-FullscreenToggle" onClick={handleClick} title={title} type="button">
            <Icon />
        </button>
    );
}
