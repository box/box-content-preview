import * as React from 'react';
import fullscreen from '../../../Fullscreen';

export default function useFullscreen(): boolean {
    const [isFullscreen, setFullscreen] = React.useState(fullscreen.isFullscreen());

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

    return isFullscreen;
}
