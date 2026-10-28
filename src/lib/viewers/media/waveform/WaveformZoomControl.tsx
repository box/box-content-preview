import classNames from 'classnames';
import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { IconButton, Text, Tooltip } from '@box/blueprint-web';
import { ZoomIn, ZoomOut } from '@box/blueprint-web-assets/icons/Medium';
import IconZoomIn24 from '../../controls/icons/IconZoomIn24';
import IconZoomOut24 from '../../controls/icons/IconZoomOut24';
import MediaToggle from '../../controls/media/MediaToggle';
import { stopActivationKeyPropagation } from '../../controls/media/utils';
import SliderControl from '../../controls/slider';
import { WAVEFORM_ZOOM_BUTTON_STEP, WAVEFORM_ZOOM_DISMISS_MS, WAVEFORM_ZOOM_SLIDER_MAX } from './constants';
import { WaveformZoomControlProps } from './types';
import {
    clampWaveformZoom,
    getWaveformZoomMultiplier,
    sliderValueFromZoom,
    stepWaveformZoom,
    zoomFromSliderValue,
} from './viewport';
import './WaveformZoomControl.scss';

export default function WaveformZoomControl({
    isBlueprintEnabled = false,
    isRevealed = false,
    maxZoom,
    onZoomChange,
    zoomLevel,
}: WaveformZoomControlProps): JSX.Element {
    const [isHovered, setHovered] = useState(false);
    const [isFocused, setFocused] = useState(false);
    const [isPinned, setPinned] = useState(false);
    const wasFlyoutOpenOnPointerDownRef = useRef(true); // first tap on + pins the flyout instead of zooming
    const zoomControlElRef = useRef<HTMLDivElement>(null); // root; outside pointerdown unpins the flyout
    const dismissTimerRef = useRef(0); // delay before hover-close of the flyout
    const sliderId = `bp-waveform-zoom-slider${useId()}`;
    const zoom = clampWaveformZoom(zoomLevel, maxZoom);
    const zoomValue = Math.round(sliderValueFromZoom(zoom, maxZoom));
    const zoomMultiplier = getWaveformZoomMultiplier(zoom);
    const isOpen = isHovered || isFocused || isRevealed || isPinned;
    const isAtMinZoom = zoomValue <= 0;
    const isAtMaxZoom = zoomValue >= WAVEFORM_ZOOM_SLIDER_MAX;

    const clearDismiss = useCallback(() => {
        window.clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = 0;
    }, []);

    useEffect(() => () => window.clearTimeout(dismissTimerRef.current), []);

    useEffect(() => {
        if (!isPinned) {
            return undefined;
        }

        const closeIfOutside = (event: PointerEvent): void => {
            const zoomControlEl = zoomControlElRef.current;
            if (!zoomControlEl || zoomControlEl.contains(event.target as Node | null)) {
                return;
            }
            setPinned(false);
            setFocused(false);
            setHovered(false);
        };

        document.addEventListener('pointerdown', closeIfOutside);
        return () => document.removeEventListener('pointerdown', closeIfOutside);
    }, [isPinned]);

    const handleSlider = useCallback(
        (newValue: number): void => {
            onZoomChange(zoomFromSliderValue(newValue, maxZoom));
        },
        [maxZoom, onZoomChange],
    );

    const handleStep = useCallback(
        (delta: number): void => {
            onZoomChange(stepWaveformZoom(zoom, maxZoom, delta));
        },
        [maxZoom, onZoomChange, zoom],
    );

    const handleZoomInPointerDown = useCallback((): void => {
        wasFlyoutOpenOnPointerDownRef.current = isHovered || isFocused || isRevealed || isPinned;
    }, [isFocused, isHovered, isPinned, isRevealed]);

    const handleZoomInClick = useCallback((): void => {
        if (!wasFlyoutOpenOnPointerDownRef.current) {
            setPinned(true);
            return;
        }
        if (!isAtMaxZoom) {
            handleStep(WAVEFORM_ZOOM_BUTTON_STEP);
        }
    }, [handleStep, isAtMaxZoom]);

    const handleZoomOutClick = useCallback((): void => {
        if (!isAtMinZoom) {
            handleStep(-WAVEFORM_ZOOM_BUTTON_STEP);
        }
    }, [handleStep, isAtMinZoom]);

    return (
        <div
            ref={zoomControlElRef}
            aria-label={__('media_zoom')}
            className={classNames('bp-WaveformZoomControl', {
                'bp-has-multiplier': zoomMultiplier,
                'bp-is-open': isOpen,
            })}
            data-testid="bp-waveform-zoom"
            onBlur={event => {
                if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    return;
                }
                setFocused(false);
                setPinned(false);
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
            role="group"
        >
            {zoomMultiplier && (
                <>
                    {isBlueprintEnabled ? (
                        <div
                            className="bp-WaveformZoomControl-multiplier"
                            data-testid="bp-waveform-zoom-multiplier"
                            title={__('zoom_current_scale')}
                        >
                            <Text as="span" color="textOnDarkDefault" variant="bodyDefaultSemibold">
                                {zoomMultiplier}
                            </Text>
                        </div>
                    ) : (
                        <span
                            className="bp-WaveformZoomControl-multiplier"
                            data-testid="bp-waveform-zoom-multiplier"
                            title={__('zoom_current_scale')}
                        >
                            {zoomMultiplier}
                        </span>
                    )}
                    <span
                        aria-hidden="true"
                        className="bp-WaveformZoomControl-divider"
                        data-testid="bp-waveform-zoom-divider"
                    />
                </>
            )}
            {isBlueprintEnabled ? (
                <Tooltip content={__('zoom_in')}>
                    <IconButton
                        aria-disabled={isOpen && isAtMaxZoom}
                        aria-label={__('zoom_in')}
                        className="bp-WaveformZoomControl-iconButton"
                        data-resin-target="waveformZoomIn"
                        data-target-id="WaveformZoomControl-zoomIn"
                        data-testid="bp-waveform-zoom-in"
                        icon={ZoomIn}
                        onClick={handleZoomInClick}
                        onKeyDown={stopActivationKeyPropagation}
                        onPointerDown={handleZoomInPointerDown}
                        size="large"
                        variant="on-dark"
                    />
                </Tooltip>
            ) : (
                <MediaToggle
                    aria-disabled={isOpen && isAtMaxZoom}
                    className="bp-WaveformZoomControl-button"
                    data-resin-target="waveformZoomIn"
                    data-testid="bp-waveform-zoom-in"
                    onClick={handleZoomInClick}
                    onPointerDown={handleZoomInPointerDown}
                    title={__('zoom_in')}
                >
                    <IconZoomIn24 />
                </MediaToggle>
            )}
            <div
                aria-hidden={!isOpen}
                className={classNames('bp-WaveformZoomControl-flyout', { 'bp-is-open': isOpen })}
            >
                {isBlueprintEnabled ? (
                    <Tooltip content={__('zoom_out')}>
                        <IconButton
                            aria-disabled={isAtMinZoom}
                            aria-label={__('zoom_out')}
                            className="bp-WaveformZoomControl-iconButton"
                            data-resin-target="waveformZoomOut"
                            data-target-id="WaveformZoomControl-zoomOut"
                            data-testid="bp-waveform-zoom-out"
                            icon={ZoomOut}
                            onClick={handleZoomOutClick}
                            onKeyDown={stopActivationKeyPropagation}
                            size="large"
                            tabIndex={isOpen ? 0 : -1}
                            variant="on-dark"
                        />
                    </Tooltip>
                ) : (
                    <MediaToggle
                        aria-disabled={isAtMinZoom}
                        className="bp-WaveformZoomControl-button"
                        data-resin-target="waveformZoomOut"
                        data-testid="bp-waveform-zoom-out"
                        onClick={handleZoomOutClick}
                        tabIndex={isOpen ? 0 : -1}
                        title={__('zoom_out')}
                    >
                        <IconZoomOut24 />
                    </MediaToggle>
                )}
                <SliderControl
                    aria-hidden={!isOpen}
                    className="bp-WaveformZoomControl-slider"
                    data-resin-target="waveformZoomSlider"
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
        </div>
    );
}
