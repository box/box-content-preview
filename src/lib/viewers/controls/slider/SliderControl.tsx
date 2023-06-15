import React from 'react';
import classNames from 'classnames';
import noop from 'lodash/noop';
import { decodeKeydown } from '../../../util';
import './SliderControl.scss';

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

export default function SliderControl({
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

    const getPosition = React.useCallback((pageX: number) => {
        const { current: sliderEl } = sliderElRef;

        if (!sliderEl) return 0;

        const { left: sliderLeft, width: sliderWidth } = sliderEl.getBoundingClientRect();
        return Math.max(0, Math.min(pageX - sliderLeft, sliderWidth));
    }, []);

    const getPositionValue = React.useCallback(
        (pageX: number) => {
            const { current: sliderEl } = sliderElRef;

            if (!sliderEl) return 0;

            const { width: sliderWidth } = sliderEl.getBoundingClientRect();
            const newValue = (getPosition(pageX) / sliderWidth) * max;
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

    const handleMouseDown = ({ button, ctrlKey, metaKey, pageX }: React.MouseEvent<Ref>): void => {
        if (button > 1 || ctrlKey || metaKey) return;

        onUpdate(getPositionValue(pageX));
        setIsScrubbing(true);
    };

    const handleMouseMove = ({ pageX }: React.MouseEvent<Ref>): void => {
        const { current: sliderEl } = sliderElRef;
        const { width: sliderWidth } = sliderEl ? sliderEl.getBoundingClientRect() : { width: 0 };

        onMove(getPositionValue(pageX), getPosition(pageX), sliderWidth);
    };

    const handleTouchStart = ({ touches }: React.TouchEvent<Ref>): void => {
        onUpdate(getPositionValue(touches[0].pageX));
        setIsScrubbing(true);
    };

    React.useEffect(() => {
        const handleDocumentMoveStop = (): void => setIsScrubbing(false);
        const handleDocumentMouseMove = (event: MouseEvent): void => {
            if (!isScrubbing || event.button > 1 || event.ctrlKey || event.metaKey) return;

            event.preventDefault();
            onUpdate(getPositionValue(event.pageX));
        };
        const handleDocumentTouchMove = (event: TouchEvent): void => {
            if (!isScrubbing || !event.touches || !event.touches[0]) return;

            event.preventDefault();
            onUpdate(getPositionValue(event.touches[0].pageX));
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
        <div
            ref={sliderElRef}
            aria-label={title}
            aria-valuemax={max}
            aria-valuemin={min}
            aria-valuenow={value}
            className={classNames('bp-SliderControl', className, { 'bp-is-scrubbing': isScrubbing })}
            onKeyDown={handleKeydown}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onTouchStart={handleTouchStart}
            role="slider"
            tabIndex={0}
            {...rest}
        >
            <div
                className="bp-SliderControl-track"
                data-testid="bp-SliderControl-track"
                style={{ backgroundImage: track }}
            />
            <div
                className="bp-SliderControl-thumb"
                data-testid="bp-SliderControl-thumb"
                style={{
                    left: `${(value / max) * 100}%`,
                }}
            />
        </div>
    );
}
