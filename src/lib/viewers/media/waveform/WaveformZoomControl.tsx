import classNames from 'classnames';
import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import MediaToggle from '../../controls/media/MediaToggle';
import SliderControl from '../../controls/slider';
import { WAVEFORM_ZOOM_DISMISS_MS, WAVEFORM_ZOOM_SLIDER_MAX } from './constants';
import { WaveformZoomControlProps } from './types';
import { clampWaveformZoom, sliderValueFromZoom, zoomFromSliderValue } from './viewport';
import './WaveformZoomControl.scss';

export default function WaveformZoomControl({
    isRevealed = false,
    maxZoom,
    onZoomChange,
    zoomLevel,
}: WaveformZoomControlProps): JSX.Element {
    const [isHovered, setHovered] = useState(false);
    const [isFocused, setFocused] = useState(false);
    const dismissTimerRef = useRef(0);
    const flyoutRef = useRef<HTMLDivElement>(null);
    const shouldFocusSliderRef = useRef(false);
    const sliderId = `bp-waveform-zoom-slider${useId()}`;
    const zoom = clampWaveformZoom(zoomLevel, maxZoom);
    const zoomValue = Math.round(sliderValueFromZoom(zoom, maxZoom));
    const isOpen = isHovered || isFocused || isRevealed;

    const clearDismiss = useCallback(() => {
        window.clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = 0;
    }, []);

    useEffect(() => () => window.clearTimeout(dismissTimerRef.current), []);

    useLayoutEffect(() => {
        if (!isOpen || !shouldFocusSliderRef.current) {
            return;
        }
        shouldFocusSliderRef.current = false;
        flyoutRef.current?.querySelector<HTMLElement>('[role="slider"]')?.focus();
    }, [isOpen]);

    const handleSlider = useCallback(
        (newValue: number): void => {
            onZoomChange(zoomFromSliderValue(newValue, maxZoom));
        },
        [maxZoom, onZoomChange],
    );

    const handleToggleClick = useCallback((): void => {
        clearDismiss();
        if (isOpen) {
            shouldFocusSliderRef.current = false;
            setFocused(false);
            setHovered(false);
            return;
        }
        shouldFocusSliderRef.current = true;
        setFocused(true);
    }, [clearDismiss, isOpen]);

    return (
        <div
            className={classNames('bp-WaveformZoomControl', { 'bp-is-open': isOpen })}
            data-testid="bp-waveform-zoom"
            onBlur={event => {
                if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    return;
                }
                setFocused(false);
            }}
            onFocus={() => {
                clearDismiss();
                setFocused(true);
            }}
            onMouseEnter={() => {
                clearDismiss();
                setHovered(true);
            }}
            onMouseLeave={() => {
                clearDismiss();
                dismissTimerRef.current = window.setTimeout(() => {
                    setHovered(false);
                }, WAVEFORM_ZOOM_DISMISS_MS);
            }}
        >
            <div
                ref={flyoutRef}
                aria-hidden={!isOpen}
                className={classNames('bp-WaveformZoomControl-flyout', { 'bp-is-open': isOpen })}
            >
                <SliderControl
                    aria-hidden={!isOpen}
                    className="bp-WaveformZoomControl-slider"
                    id={sliderId}
                    max={WAVEFORM_ZOOM_SLIDER_MAX}
                    min={0}
                    onUpdate={handleSlider}
                    step={1}
                    style={{ '--bp-zoom-t': zoomValue / WAVEFORM_ZOOM_SLIDER_MAX } as React.CSSProperties}
                    tabIndex={isOpen ? 0 : -1}
                    title={__('media_zoom_slider')}
                    value={zoomValue}
                />
            </div>
            <MediaToggle
                aria-controls={sliderId}
                aria-expanded={isOpen}
                className="bp-WaveformZoomControl-toggle"
                onClick={handleToggleClick}
                title={__('media_zoom')}
            >
                <svg aria-hidden="true" focusable="false" height="20" viewBox="0 0 24 24" width="20">
                    <path
                        d="M4 12h16M7 9l-3 3 3 3M17 9l3 3-3 3"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.75"
                    />
                </svg>
            </MediaToggle>
        </div>
    );
}
