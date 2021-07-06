import React from 'react';
import classNames from 'classnames';
import { formatTime } from './DurationLabels';
import './Filmstrip.scss';

const FILMSTRIP_FRAMES_PER_ROW = 100;
const FILMSTRIP_FRAME_HEIGHT = 90;
const FILMSTRIP_FRAME_WIDTH = 160; // Default frame width for loading crawler

export type Props = {
    aspectRatio?: number;
    imageUrl?: string;
    interval?: number;
    isShown?: boolean;
    position?: number;
    positionMax?: number;
    time?: number;
};

export default function Filmstrip({
    aspectRatio = 0,
    imageUrl = '',
    interval = 1,
    isShown,
    position = 0,
    positionMax = 0,
    time = 0,
}: Props): JSX.Element | null {
    const [isLoading, setIsLoading] = React.useState(true);
    const frameNumber = Math.floor(time / interval); // Current frame based on current time
    const frameRow = Math.floor(frameNumber / FILMSTRIP_FRAMES_PER_ROW); // Row number if there is more than one row
    const frameWidth = Math.floor(aspectRatio * FILMSTRIP_FRAME_HEIGHT) || FILMSTRIP_FRAME_WIDTH;
    const frameBackgroundLeft = -(frameNumber % FILMSTRIP_FRAMES_PER_ROW) * frameWidth; // Frame position in its row
    const frameBackgroundTop = -(frameRow * FILMSTRIP_FRAME_HEIGHT); // Row position in its filmstrip
    const filmstripLeft = Math.min(Math.max(0, position - frameWidth / 2), positionMax - frameWidth);

    React.useEffect((): void => {
        if (!imageUrl) return;

        const filmstripImage = document.createElement('img');
        filmstripImage.onload = (): void => setIsLoading(false);
        filmstripImage.src = imageUrl;
    }, [imageUrl]);

    return (
        <div className={classNames('bp-Filmstrip', { 'bp-is-shown': isShown })} style={{ left: `${filmstripLeft}px` }}>
            <div
                className="bp-Filmstrip-frame"
                data-testid="bp-Filmstrip-frame"
                style={{
                    backgroundImage: imageUrl ? `url('${imageUrl}')` : '',
                    backgroundPositionX: frameBackgroundLeft,
                    backgroundPositionY: frameBackgroundTop,
                    height: FILMSTRIP_FRAME_HEIGHT,
                    width: frameWidth,
                }}
            >
                {isLoading && (
                    <div className="bp-crawler" data-testid="bp-Filmstrip-crawler">
                        <div />
                        <div />
                        <div />
                    </div>
                )}
            </div>

            <div className="bp-Filmstrip-time" data-testid="bp-Filmstrip-time">
                {formatTime(time)}
            </div>
        </div>
    );
}
