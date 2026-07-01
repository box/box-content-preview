import React from 'react';
import isFinite from 'lodash/isFinite';
import noop from 'lodash/noop';
import { bdlGray65, white } from 'box-ui-elements/es/styles/variables';
import buildClusters from './buildClusters';
import FilmstripV2 from './FilmstripV2';
import MarkerCluster from './MarkerCluster';
import MarkerTick from './MarkerTick';
import SliderControl from '../slider';
import { CommentMarker } from './types';
import { percent } from './utils';
import './TimeControlsV2.scss';

export type Props = {
    aspectRatio?: number;
    commentMarkers?: CommentMarker[];
    currentTime?: number;
    durationTime?: number;
    filmstripInterval?: number;
    filmstripUrl?: string;
    fps?: number;
    onCommentMarkerClick?: (marker: CommentMarker) => void;
    onTimeChange: (volume: number) => void;
};

export default function TimeControlsV2({
    aspectRatio,
    commentMarkers = [],
    currentTime = 0,
    durationTime = 0,
    filmstripInterval,
    filmstripUrl,
    fps,
    onCommentMarkerClick,
    onTimeChange,
}: Props): JSX.Element {
    const [isSliderHovered, setIsSliderHovered] = React.useState(false);
    const [hoverPosition, setHoverPosition] = React.useState(0);
    const [hoverPositionMax, setHoverPositionMax] = React.useState(0);
    const [hoverTime, setHoverTime] = React.useState(0);
    const [trackWidth, setTrackWidth] = React.useState(0);
    const scrubberRef = React.useRef<HTMLDivElement>(null);
    const currentValue = isFinite(currentTime) ? currentTime : 0;
    const durationValue = isFinite(durationTime) ? durationTime : 0;
    const currentPercentage = percent(currentValue, durationValue);

    React.useLayoutEffect(() => {
        const el = scrubberRef.current;
        if (!el) return undefined;

        setTrackWidth(el.clientWidth);

        const observer = new ResizeObserver(entries => {
            entries.forEach(entry => {
                setTrackWidth(entry.contentRect.width);
            });
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const clusters = React.useMemo(() => buildClusters(commentMarkers, durationValue, trackWidth), [
        commentMarkers,
        durationValue,
        trackWidth,
    ]);

    const trackMask = React.useMemo(() => {
        if (durationValue <= 0 || clusters.length === 0) return undefined;

        const HALF_GAP = 2;
        const stops: string[] = [];

        stops.push('black 0%');
        clusters.forEach(({ leftPercent, rightPercent }) => {
            const isRange = leftPercent !== rightPercent;
            const leftPad = isRange ? HALF_GAP + 1 : HALF_GAP;
            const rightPad = isRange ? HALF_GAP + 1 : HALF_GAP;
            stops.push(`black calc(${leftPercent}% - ${leftPad}px)`);
            stops.push(`transparent calc(${leftPercent}% - ${leftPad}px)`);
            stops.push(`transparent calc(${rightPercent}% + ${rightPad}px)`);
            stops.push(`black calc(${rightPercent}% + ${rightPad}px)`);
        });
        stops.push('black 100%');

        return `linear-gradient(to right, ${stops.join(', ')})`;
    }, [durationValue, clusters]);

    const handleMouseMove = (newTime: number, newPosition: number, width: number): void => {
        setHoverPosition(newPosition);
        setHoverPositionMax(width);
        setHoverTime(newTime);
    };

    return (
        <div className="bp-TimeControlsV2" data-testid="bp-time-controls-v2">
            {!!filmstripInterval && (
                <FilmstripV2
                    aspectRatio={aspectRatio}
                    fps={fps}
                    imageUrl={filmstripUrl}
                    interval={filmstripInterval}
                    isShown={isSliderHovered}
                    position={hoverPosition}
                    positionMax={hoverPositionMax}
                    time={hoverTime}
                />
            )}
            <div
                ref={scrubberRef}
                className="bp-TimeControlsV2-scrubber"
                style={trackMask ? ({ '--bp-track-mask': trackMask } as React.CSSProperties) : undefined}
            >
                <SliderControl
                    className="bp-TimeControlsV2-slider"
                    data-resin-target="timeScrubber"
                    max={durationValue}
                    min={0}
                    onBlur={noop}
                    onFocus={noop}
                    onMouseOut={(): void => setIsSliderHovered(false)}
                    onMouseOver={(): void => setIsSliderHovered(true)}
                    onMove={handleMouseMove}
                    onUpdate={onTimeChange}
                    step={fps ? 1 / fps : 5}
                    title={__('media_time_slider')}
                    track={`linear-gradient(to right, ${white} calc(${currentPercentage}% - 2.5px), transparent calc(${currentPercentage}% - 2.5px), transparent calc(${currentPercentage}% + 2.5px), ${bdlGray65} calc(${currentPercentage}% + 2.5px), ${bdlGray65} 100%)`}
                    value={currentValue}
                />
                {durationValue > 0 &&
                    clusters.map(cluster =>
                        cluster.isSinglePoint ? (
                            <MarkerTick
                                key={cluster.id}
                                markers={cluster.markers}
                                onMarkerClick={onCommentMarkerClick}
                                position={cluster.leftPercent}
                            />
                        ) : (
                            <MarkerCluster key={cluster.id} cluster={cluster} onMarkerClick={onCommentMarkerClick} />
                        ),
                    )}
            </div>
        </div>
    );
}
