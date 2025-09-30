import classNames from 'classnames';
import noop from 'lodash/noop';
import React from 'react';
import { decodeKeydown } from '../../../util';
import './VolumeSliderControl.scss';

export type Ref = HTMLDivElement;

export type Props = React.HTMLAttributes<Ref> & {
    className?: string;
    max?: number;
    min?: number;
    onMove?: (value: number, position: number, width: number) => void;
    onUpdate?: (value: number) => void;
    step?: number;
    title: string;
    value: number;
    onMouseOver: () => void;
};

// VolumeSliderControls is a veritical slider that controls the volume of the media player.
// It is different from the SliderControl in that it is vertical and the track is not a horizontal gradient.
// Instead, it sets the tracks height relative to the volume value. As the volume goes up the tracks height goes up
// and vice versa. The callbacks are the same as the SliderControl except the mouse movents are tracked vertically
// instead of horizontally. With this comoponent, the only other use for the SliderControl is for the tracking the play
// progress of a media player.
export default function VolumeSliderControl({
    className,
    max = 100,
    min = 0,
    onMove = noop,
    onUpdate = noop,
    step = 1,
    title,
    value,
    onMouseOver,
    ...rest
}: Props): JSX.Element {
    const [isScrubbing, setIsScrubbing] = React.useState(false);
    const sliderElRef = React.useRef<Ref>(null);

    const getPositionRelativeToSlider = React.useCallback((clientY: number) => {
        const { current: sliderEl } = sliderElRef;
        if (!sliderEl) return 0;

        const { top: sliderTop, height: sliderHeight } = sliderEl.getBoundingClientRect();

        // Calculate distance from bottom of slider
        const sliderBottom = sliderTop + sliderHeight;
        const distanceFromBottom = sliderBottom - clientY;

        return Math.max(5, distanceFromBottom);
    }, []);

    const getPositionValue = React.useCallback(
        (pageY: number, clientY: number) => {
            const { current: sliderEl } = sliderElRef;
            if (!sliderEl) return 0;
            const { height: sliderHeight } = sliderEl.getBoundingClientRect();
            const positionRelativeToSlider = getPositionRelativeToSlider(clientY);
            const newValue = (positionRelativeToSlider / sliderHeight) * max;
            return Math.max(min, Math.min(newValue, max));
        },
        [getPositionRelativeToSlider, max, min],
    );

    const handleKeydown = (event: React.KeyboardEvent): void => {
        const key = decodeKeydown(event);
        if (key === 'ArrowDown') {
            event.stopPropagation(); // Prevents global key handling
            onUpdate(Math.max(min, Math.min(value - step, max)));
        }

        if (key === 'ArrowUp') {
            event.stopPropagation(); // Prevents global key handling
            onUpdate(Math.max(min, Math.min(value + step, max)));
        }
    };

    const handleMouseDown = (event: React.MouseEvent<Ref>): void => {
        const { button, ctrlKey, metaKey, pageY, clientY, stopPropagation } = event;
        if (button > 1 || ctrlKey || metaKey) return;
        onUpdate(getPositionValue(pageY, clientY));
        setIsScrubbing(true);
        // Prevent clicking on the slider from triggering the mouse down event on the parent slider track
        event.stopPropagation();
    };

    const handleMouseMove = ({ pageY, clientY }: React.MouseEvent<Ref>): void => {
        const { current: sliderEl } = sliderElRef;
        const { height: sliderHeight } = sliderEl ? sliderEl.getBoundingClientRect() : { height: 0 };
        onMove(getPositionValue(pageY, clientY), getPositionRelativeToSlider(clientY), sliderHeight);
    };

    const handleTouchStart = ({ touches }: React.TouchEvent<Ref>): void => {
        onUpdate(getPositionValue(touches[0].pageY, touches[0].clientY));
        setIsScrubbing(true);
    };

    React.useEffect(() => {
        const handleDocumentMoveStop = (): void => setIsScrubbing(false);
        const handleDocumentMouseMove = (event: MouseEvent): void => {
            if (!isScrubbing || event.button > 1 || event.ctrlKey || event.metaKey) return;

            event.preventDefault();
            onUpdate(getPositionRelativeToSlider(event.clientY));
        };
        const handleDocumentTouchMove = (event: TouchEvent): void => {
            if (!isScrubbing || !event.touches || !event.touches[0]) return;

            event.preventDefault();
            onUpdate(getPositionRelativeToSlider(event.touches[0].clientY));
        };

        if (isScrubbing) {
            document.addEventListener('mousemove', handleDocumentMouseMove);
            document.addEventListener('mouseup', handleDocumentMoveStop);
            document.addEventListener('touchend', handleDocumentMoveStop);
            document.addEventListener('touchmove', handleDocumentTouchMove);
        }

        return (): void => {
            document.removeEventListener('mousemove', handleDocumentMouseMove);
            document.removeEventListener('mouseup', handleDocumentMoveStop);
            document.removeEventListener('touchend', handleDocumentMoveStop);
            document.removeEventListener('touchmove', handleDocumentTouchMove);
        };
    }, [isScrubbing, getPositionRelativeToSlider, onUpdate]);

    const heightValueBasedOnVolume = value === 0 ? 5 : value;
    return (
        <div
            className={classNames('bp-VolumeVerticalSliderControl', className, { 'bp-is-scrubbing': isScrubbing })}
            {...rest}
        >
            <div className="bp-VolumeVerticalSliderControl-track-container">
                <div
                    ref={sliderElRef}
                    className="bp-VolumeVerticalSliderControl-track-background"
                    onMouseDown={handleMouseDown}
                    role="button"
                    tabIndex={0}
                >
                    <div
                        aria-label={title}
                        aria-valuemax={max}
                        aria-valuemin={min}
                        aria-valuenow={value}
                        className="bp-VolumeVerticalSliderControl-track"
                        data-testid="bp-volume-slider-control-track"
                        onFocus={onMouseOver}
                        onKeyDown={handleKeydown}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseOver={onMouseOver}
                        onTouchStart={handleTouchStart}
                        role="slider"
                        style={{
                            height: `${(heightValueBasedOnVolume / max) * 100}%`,
                        }}
                        tabIndex={0}
                    />
                </div>
            </div>
        </div>
    );
}
