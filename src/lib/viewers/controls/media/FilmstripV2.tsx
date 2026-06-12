import React from 'react';
import classNames from 'classnames';
import formatTimecode from '../../media/formatTimecode';
import { DEFAULT_FPS } from '../../media/videoFps';
import './FilmstripV2.scss';

const FILMSTRIP_FRAMES_PER_ROW = 100;
const FILMSTRIP_SOURCE_FRAME_HEIGHT = 90;
const FILMSTRIP_DISPLAY_HEIGHT = 135;
const FILMSTRIP_DISPLAY_WIDTH = 240;

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
    fps = DEFAULT_FPS,
    imageUrl = '',
    interval = 1,
    isShown,
    position = 0,
    positionMax = 0,
    time = 0,
}: Props): JSX.Element | null {
    const [isLoading, setIsLoading] = React.useState(true);
    const [imageWidth, setImageWidth] = React.useState<number>(0);
    const frameNumber = Math.floor(time / interval);
    const frameRow = Math.floor(frameNumber / FILMSTRIP_FRAMES_PER_ROW);
    const sourceFrameWidth = imageWidth
        ? Math.floor(imageWidth / FILMSTRIP_FRAMES_PER_ROW)
        : Math.floor(aspectRatio * FILMSTRIP_SOURCE_FRAME_HEIGHT) ||
          Math.floor(FILMSTRIP_DISPLAY_WIDTH * (FILMSTRIP_SOURCE_FRAME_HEIGHT / FILMSTRIP_DISPLAY_HEIGHT));
    const scale = FILMSTRIP_DISPLAY_HEIGHT / FILMSTRIP_SOURCE_FRAME_HEIGHT;
    const displayWidth = Math.floor(sourceFrameWidth * scale) || FILMSTRIP_DISPLAY_WIDTH;
    const backgroundLeft = -(frameNumber % FILMSTRIP_FRAMES_PER_ROW) * displayWidth;
    const backgroundTop = -(frameRow * FILMSTRIP_DISPLAY_HEIGHT);
    const backgroundWidth = imageWidth ? imageWidth * scale : undefined;
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
                    backgroundImage: imageUrl ? `url('${imageUrl}')` : '',
                    backgroundPositionX: backgroundLeft,
                    backgroundPositionY: backgroundTop,
                    backgroundSize: backgroundWidth ? `${backgroundWidth}px auto` : undefined,
                    height: FILMSTRIP_DISPLAY_HEIGHT,
                    width: displayWidth,
                }}
            >
                {isLoading && (
                    <div className="bp-crawler" data-testid="bp-FilmstripV2-crawler">
                        <div />
                        <div />
                        <div />
                    </div>
                )}
            </div>
            <div className="bp-FilmstripV2-time" data-testid="bp-FilmstripV2-time">
                {formatTimecode(time, fps)}
            </div>
        </div>
    );
}
