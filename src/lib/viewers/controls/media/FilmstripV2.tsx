import React from 'react';
import classNames from 'classnames';
import formatTimecode from '../../media/formatTimecode';
import { formatTime } from './DurationLabels';
import './FilmstripV2.scss';

const FILMSTRIP_FRAMES_PER_ROW = 100;
const FILMSTRIP_SOURCE_FRAME_HEIGHT = 90;
const FILMSTRIP_DISPLAY_HEIGHT = 135;
const FILMSTRIP_DISPLAY_WIDTH = 240;
const FILMSTRIP_DISPLAY_SCALE = FILMSTRIP_DISPLAY_HEIGHT / FILMSTRIP_SOURCE_FRAME_HEIGHT;

export type Props = {
    aspectRatio?: number;
    fps?: number;
    imageUrl?: string;
    interval?: number;
    isShown?: boolean;
    position?: number;
    positionMax?: number;
    time?: number;
};

export default function FilmstripV2({
    aspectRatio = 0,
    fps,
    imageUrl = '',
    interval = 1,
    isShown,
    position = 0,
    positionMax = 0,
    time = 0,
}: Props): JSX.Element | null {
    const [isLoading, setIsLoading] = React.useState(true);
    const [imageWidth, setImageWidth] = React.useState<number>(0);

    const frameNumber = Math.floor(time / interval); // Current frame based on current time
    const frameRow = Math.floor(frameNumber / FILMSTRIP_FRAMES_PER_ROW); // Row number if there is more than one row
    const sourceFrameWidth = imageWidth
        ? Math.floor(imageWidth / FILMSTRIP_FRAMES_PER_ROW)
        : Math.floor(aspectRatio * FILMSTRIP_SOURCE_FRAME_HEIGHT) ||
          Math.floor(FILMSTRIP_DISPLAY_WIDTH * (FILMSTRIP_SOURCE_FRAME_HEIGHT / FILMSTRIP_DISPLAY_HEIGHT));
    const frameBackgroundLeft = -(frameNumber % FILMSTRIP_FRAMES_PER_ROW) * sourceFrameWidth; // Frame position in its row
    const frameBackgroundTop = -(frameRow * FILMSTRIP_SOURCE_FRAME_HEIGHT); // Row position in its filmstrip

    const displayWidth = Math.floor(sourceFrameWidth * FILMSTRIP_DISPLAY_SCALE) || FILMSTRIP_DISPLAY_WIDTH;
    const cardWidth = displayWidth + 24;
    const filmstripLeft = Math.min(Math.max(0, position - cardWidth / 2), positionMax - cardWidth);

    React.useEffect((): void => {
        if (!imageUrl) return;

        const filmstripImage = document.createElement('img');
        filmstripImage.onload = (): void => {
            setImageWidth(filmstripImage.naturalWidth);
            setIsLoading(false);
        };
        filmstripImage.src = imageUrl;
    }, [imageUrl]);

    return (
        <div
            className={classNames('bp-FilmstripV2', { 'bp-is-shown': isShown })}
            data-testid="bp-FilmstripV2"
            style={{ left: `${filmstripLeft}px` }}
        >
            <div
                className="bp-FilmstripV2-frame"
                data-testid="bp-FilmstripV2-frame"
                style={{
                    height: FILMSTRIP_DISPLAY_HEIGHT,
                    width: displayWidth,
                }}
            >
                {!!imageUrl && (
                    <div
                        className="bp-FilmstripV2-frameImage"
                        data-testid="bp-FilmstripV2-frameImage"
                        style={{
                            backgroundImage: `url('${imageUrl}')`,
                            backgroundPositionX: frameBackgroundLeft,
                            backgroundPositionY: frameBackgroundTop,
                            height: FILMSTRIP_SOURCE_FRAME_HEIGHT,
                            transform: `scale(${FILMSTRIP_DISPLAY_SCALE})`,
                            width: sourceFrameWidth,
                        }}
                    />
                )}
                {isLoading && (
                    <div className="bp-crawler" data-testid="bp-FilmstripV2-crawler">
                        <div />
                        <div />
                        <div />
                    </div>
                )}
            </div>
            <div className="bp-FilmstripV2-time" data-testid="bp-FilmstripV2-time">
                {fps ? formatTimecode(time, fps) : formatTime(time)}
            </div>
        </div>
    );
}
