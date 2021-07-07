import React from 'react';
import { formatTime } from './DurationLabels';
import './Filmstrip.scss';

const FILMSTRIP_FRAMES_PER_ROW = 100;
const FILMSTRIP_FRAME_HEIGHT = 90;

export type Props = {
    aspectRatio?: number;
    interval?: number;
    imageUrl?: string;
    isShown?: boolean;
    position: number;
    positionMax: number;
    time: number;
};

export default function Filmstrip({
    aspectRatio = 1,
    interval = 1,
    imageUrl = '',
    isShown,
    position = 0,
    positionMax = 0,
    time = 0,
}: Props): JSX.Element | null {
    const [isLoading, setIsLoading] = React.useState(true);
    const frameNumber = Math.floor(time / interval);
    const frameWidth = Math.floor(FILMSTRIP_FRAME_HEIGHT * aspectRatio) || 160; // Default frame width for loading crawler
    const frameBackgroundLeft = -1 * (frameNumber % FILMSTRIP_FRAMES_PER_ROW) * frameWidth; // Frame position in a given row
    const frameBackgroundTop = -FILMSTRIP_FRAME_HEIGHT * Math.floor(frameNumber / FILMSTRIP_FRAMES_PER_ROW); // Row number if there is more than one row
    const filmstripLeft = Math.min(Math.max(0, position - frameWidth / 2), positionMax - frameWidth);

    React.useEffect((): void => {
        if (!imageUrl) return;

        const filmstripImage = new Image();
        filmstripImage.onload = (): void => setIsLoading(false);
        filmstripImage.src = imageUrl;
    }, [imageUrl]);

    return (
        <div
            className="bp-Filmstrip"
            style={{
                left: `${filmstripLeft}px`,
                visibility: isShown ? 'visible' : 'hidden',
            }}
        >
            <div
                className="bp-Filmstrip-frame"
                style={{
                    backgroundImage: `url('${imageUrl}')`,
                    backgroundPositionX: `${frameBackgroundLeft}px`,
                    backgroundPositionY: `${frameBackgroundTop}px`,
                    height: FILMSTRIP_FRAME_HEIGHT,
                    width: frameWidth,
                }}
            >
                {isLoading && (
                    <div className="bp-crawler">
                        <div />
                        <div />
                        <div />
                    </div>
                )}
            </div>

            <div className="bp-Filmstrip-time">{formatTime(time)}</div>
        </div>
    );
}
