import React from 'react';
import classNames from 'classnames';
import noop from 'lodash/noop';
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
    track?: string;
    value: number;
};

export default function VolumeSliderControl({
    className,
    max = 100,
    min = 0,
    onMove = noop,
    onUpdate = noop,
    step = 1,
    title,
    track,
    value,
    ...rest
}: Props): JSX.Element {
    const [isScrubbing, setIsScrubbing] = React.useState(false);
    const sliderElRef = React.useRef<Ref>(null);

    /*

{
    "x": 1324,
    "y": 645.515625,
    "width": 34,
    "height": 200,
    "top": 645.515625,
    "right": 1358,
    "bottom": 845.515625,
    "left": 1324
}

    */

    const getPosition = React.useCallback((pageY: number) => {
        const { current: sliderEl } = sliderElRef;

        if (!sliderEl) return 0;

        const { top: sliderTop, height: sliderHeight } = sliderEl.getBoundingClientRect();
        return Math.max(0, Math.min(pageY - sliderTop, sliderHeight));
    }, []);

    const getPositionValue = React.useCallback(
        (pageY: number) => {
            const { current: sliderEl } = sliderElRef;

            if (!sliderEl) return 0;

            const { height: sliderHeight } = sliderEl.getBoundingClientRect();
            const newValue = (getPosition(pageY) / sliderHeight) * max;
            return Math.max(min, Math.min(newValue, max));
        },
        [getPosition, max, min],
    );

    const handleKeydown = (event: React.KeyboardEvent): void => {
        const key = decodeKeydown(event);

        if (key === 'ArrowLeft') {
            event.stopPropagation(); // Prevents global key handling
            onUpdate(Math.max(min, Math.min(value - step, max)));
        }

        if (key === 'ArrowRight') {
            event.stopPropagation(); // Prevents global key handling
            onUpdate(Math.max(min, Math.min(value + step, max)));
        }
    };

    const handleMouseDown = ({ button, ctrlKey, metaKey, pageY }: React.MouseEvent<Ref>): void => {
        if (button > 1 || ctrlKey || metaKey) return;

        onUpdate(getPositionValue(pageY));
        setIsScrubbing(true);
    };

    const handleMouseMove = ({ pageY }: React.MouseEvent<Ref>): void => {
        const { current: sliderEl } = sliderElRef;
        const { height: sliderHeight } = sliderEl ? sliderEl.getBoundingClientRect() : { height: 0 };
        console.log('mouse move', getPositionValue(pageY), getPosition(pageY), sliderHeight);
        onMove(getPositionValue(pageY), getPosition(pageY), sliderHeight);
    };

    const handleTouchStart = ({ touches }: React.TouchEvent<Ref>): void => {
        onUpdate(getPositionValue(touches[0].pageY));
        setIsScrubbing(true);
    };

    React.useEffect(() => {
        const handleDocumentMoveStop = (): void => setIsScrubbing(false);
        const handleDocumentMouseMove = (event: MouseEvent): void => {
            if (!isScrubbing || event.button > 1 || event.ctrlKey || event.metaKey) return;

            event.preventDefault();
            onUpdate(getPositionValue(event.pageY));
        };
        const handleDocumentTouchMove = (event: TouchEvent): void => {
            if (!isScrubbing || !event.touches || !event.touches[0]) return;

            event.preventDefault();
            onUpdate(getPositionValue(event.touches[0].pageY));
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
    }, [isScrubbing, getPositionValue, onUpdate]);

    return (
        <>
            <div
                ref={sliderElRef}
                aria-label={title}
                aria-valuemax={max}
                aria-valuemin={min}
                aria-valuenow={value}
                className={classNames('bp-VolumeSliderControl', className, { 'bp-is-scrubbing': isScrubbing })}
                onKeyDown={handleKeydown}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onTouchStart={handleTouchStart}
                role="slider"
                style={{ transform: 'rotate(-90deg)', display: 'none' }}
                tabIndex={0}
                {...rest}
            >
                <div
                    className="bp-VolumeSliderControl-track"
                    data-testid="bp-volume-slider-control-track"
                    style={{ backgroundImage: track }}
                />
                <div
                    className="bp-VolumeSliderControl-thumb"
                    data-testid="bp-volume-slider-control-thumb"
                    style={{
                        top: `${(value / max) * 100}%`,
                    }}
                />
            </div>

            <div
                className={classNames('bp-VolumeVerticalSliderControl', className, { 'bp-is-scrubbing': isScrubbing })}
            >
                <div className="bp-VolumeVerticalSliderControl-track-container">
                    <div className="bp-VolumeVerticalSliderControl-track-background">
                        <div
                            ref={sliderElRef}
                            aria-label={title}
                            aria-valuemax={max}
                            aria-valuemin={min}
                            aria-valuenow={value}
                            className="bp-VolumeVerticalSliderControl-track"
                            onKeyDown={handleKeydown}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onTouchStart={handleTouchStart}
                            role="slider"
                            style={{
                                height: `${(value / max) * 100}%`,
                            }}
                            tabIndex={0}
                        />
                    </div>
                </div>
            </div>
        </>
    );
}
