import React from 'react';
import classNames from 'classnames';
import { DropdownMenu, Text } from '@box/blueprint-web';
import { ChevronDown, ChevronUp } from '@box/blueprint-web-assets/icons/Medium';
import { bpIconCtaIconOnDark } from '@box/blueprint-web-assets/tokens/tokens';
import formatTimecode from '../../media/formatTimecode';
import IconCheckMark24 from '../icons/IconCheckMark24';
import IconChevronDownMedium24 from '../icons/IconChevronDownMedium24';
import IconChevronUpMedium24 from '../icons/IconChevronUpMedium24';
import useClickOutside from '../hooks/useClickOutside';
import { renderTabularDigits } from '../../../TabularDigits';
import { DEFAULT_FPS } from '../../media/videoFps';
import { PortalContainerContext } from '../../../BlueprintProviders';
import { decodeKeydown } from '../../../util';
import { formatTime } from './DurationLabels';
import './TimestampControl.scss';

export enum TimeFormat {
    STANDARD = 'standard',
    TIMECODE = 'timecode',
    FRAMES = 'frames',
}

export type Props = {
    currentTime?: number;
    durationTime?: number;
    fps?: number;
    canChangeTimeFormat?: boolean;
    isBlueprintEnabled?: boolean;
    isNarrowWidth?: boolean;
    mediaEl?: HTMLVideoElement | null;
};

export function formatLabel(time: number, format: TimeFormat, fps: number): string {
    switch (format) {
        case TimeFormat.TIMECODE:
            return formatTimecode(time, fps);
        case TimeFormat.FRAMES:
            return Math.floor(time * fps).toString();
        case TimeFormat.STANDARD:
        default:
            return formatTime(time);
    }
}

// The viewer maps Space, Enter and the arrow keys to playback, seek and volume shortcuts.
const stopMenuTriggerKeyPropagation = (event: React.KeyboardEvent): void => {
    const key = decodeKeydown(event);

    if (key === 'Enter' || key === 'Space' || key === 'ArrowDown' || key === 'ArrowUp') {
        event.stopPropagation();
    }
};

const FORMAT_OPTIONS = [
    { label: () => __('media_time_format_standard'), value: TimeFormat.STANDARD },
    { label: () => __('media_time_format_timecode'), value: TimeFormat.TIMECODE },
    { label: () => __('media_time_format_frames'), value: TimeFormat.FRAMES },
];

export default function TimestampControl({
    currentTime = 0,
    durationTime = 0,
    fps = DEFAULT_FPS,
    canChangeTimeFormat = false,
    isBlueprintEnabled = false,
    isNarrowWidth = false,
    mediaEl,
}: Props): JSX.Element {
    const [format, setFormat] = React.useState<TimeFormat>(TimeFormat.STANDARD);
    const [isOpen, setIsOpen] = React.useState(false);
    const containerElRef = React.useRef<HTMLDivElement>(null);
    const buttonElRef = React.useRef<HTMLButtonElement>(null);
    const currentElRef = React.useRef<HTMLSpanElement>(null);
    const durationElRef = React.useRef<HTMLSpanElement>(null);
    const rafIdRef = React.useRef<number>(0);

    const portalContainer = React.useContext(PortalContainerContext) ?? undefined;

    useClickOutside(containerElRef, () => {
        // The Blueprint menu portals outside the container and handles outside clicks itself.
        if (!isBlueprintEnabled) {
            setIsOpen(false);
        }
    });

    React.useEffect(() => {
        const container = mediaEl?.closest('.bp-media-container');
        if (container) {
            container.setAttribute('data-time-format', format);
            container.setAttribute('data-fps', String(fps));
        }
    }, [format, fps, mediaEl]);

    React.useEffect(() => {
        // Re-render via timeupdate events is too slow (~4Hz) for frame-accurate
        // formats, so update the current time text on animation frames instead
        if (format === TimeFormat.STANDARD || !mediaEl || !currentElRef.current) {
            return undefined;
        }

        const tick = (): void => {
            if (currentElRef.current && mediaEl) {
                const label = formatLabel(mediaEl.currentTime, format, fps);

                if (isBlueprintEnabled) {
                    renderTabularDigits(currentElRef.current, label);
                } else {
                    currentElRef.current.textContent = label;
                }
            }
            rafIdRef.current = requestAnimationFrame(tick);
        };

        const startLoop = (): void => {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = requestAnimationFrame(tick);
        };

        const stopLoop = (): void => {
            cancelAnimationFrame(rafIdRef.current);
        };

        if (mediaEl.paused === false) {
            startLoop();
        }

        mediaEl.addEventListener('play', startLoop);
        mediaEl.addEventListener('pause', stopLoop);

        return () => {
            stopLoop();
            mediaEl.removeEventListener('play', startLoop);
            mediaEl.removeEventListener('pause', stopLoop);
        };
    }, [format, fps, isBlueprintEnabled, mediaEl]);

    const currentLabel = formatLabel(currentTime, format, fps);

    React.useLayoutEffect(() => {
        // The animation frame loop owns the label while a frame-accurate format is playing.
        const isFrameLoopRunning = format !== TimeFormat.STANDARD && mediaEl?.paused === false;

        if (isBlueprintEnabled && currentElRef.current && !isFrameLoopRunning) {
            renderTabularDigits(currentElRef.current, currentLabel);
        }
    }, [currentLabel, format, isBlueprintEnabled, mediaEl]);

    const durationLabel = formatLabel(durationTime, format, fps);

    React.useLayoutEffect(() => {
        if (isBlueprintEnabled && durationElRef.current) {
            renderTabularDigits(durationElRef.current, durationLabel);
        }
    }, [durationLabel, isBlueprintEnabled, isNarrowWidth]);

    const handleKeyDown = (event: React.KeyboardEvent): void => {
        const key = decodeKeydown(event);

        if (key === 'Escape' && isOpen) {
            setIsOpen(false);

            if (buttonElRef.current) {
                buttonElRef.current.focus(); // Prevent focus from falling back to the body on flyout close
            }

            event.stopPropagation();
        }
    };

    // Menu keys must not reach the viewer shortcuts or the host page, which may close the preview
    // on Escape. The Blueprint menu's own Escape listener is on the document, so close it here.
    const handleMenuKeyDown = (event: React.KeyboardEvent): void => {
        event.stopPropagation();
        handleKeyDown(event);
    };

    const handleSelect = (selectedFormat: TimeFormat): void => {
        setFormat(selectedFormat);
        setIsOpen(false);

        if (buttonElRef.current) {
            buttonElRef.current.focus();
        }
    };

    const createKeyDownHandler =
        (selectedFormat: TimeFormat) =>
        (event: React.KeyboardEvent): void => {
            const key = decodeKeydown(event);

            if (key !== 'Space' && key !== 'Enter') {
                return;
            }

            // Prevent the global media key handling logic, i.e. Space toggling playback
            event.stopPropagation();
            handleSelect(selectedFormat);
        };

    const renderChevron = (): JSX.Element => {
        if (isBlueprintEnabled) {
            const Chevron = isOpen ? ChevronUp : ChevronDown;
            return <Chevron className="bp-TimestampControl-chevron" color={bpIconCtaIconOnDark} />;
        }

        return isOpen ? (
            <IconChevronUpMedium24 className="bp-TimestampControl-chevron" />
        ) : (
            <IconChevronDownMedium24 className="bp-TimestampControl-chevron" />
        );
    };

    const renderBlueprintTime = (): JSX.Element => (
        <>
            {/* Blueprint types Text's ref as its props rather than the rendered element. The time
                children are written by renderTabularDigits, which the animation frame loop also calls. */}
            <Text
                ref={currentElRef as unknown as React.ComponentProps<typeof Text>['ref']}
                as="span"
                color="textOnDarkDefault"
                variant="bodyDefault"
            />
            {!isNarrowWidth && (
                <>
                    <Text as="span" color="textOnDarkDefault" variant="bodyDefault">
                        /
                    </Text>
                    <Text
                        ref={durationElRef as unknown as React.ComponentProps<typeof Text>['ref']}
                        as="span"
                        color="textOnDarkDefault"
                        variant="bodyDefault"
                    />
                </>
            )}
        </>
    );

    if (isBlueprintEnabled && !canChangeTimeFormat) {
        return (
            <div className="bp-TimestampControl" data-testid="bp-TimestampControl">
                <span className="bp-TimestampControl-static" data-testid="bp-TimestampControl-static">
                    {renderBlueprintTime()}
                </span>
            </div>
        );
    }

    if (isBlueprintEnabled) {
        return (
            <div ref={containerElRef} className="bp-TimestampControl" data-testid="bp-TimestampControl">
                <DropdownMenu.Root modal={false} onOpenChange={setIsOpen} open={isOpen}>
                    <DropdownMenu.Trigger asChild>
                        <button
                            aria-label={__('media_time_format')}
                            className={classNames('bp-TimestampControl-button', { 'bp-is-open': isOpen })}
                            data-resin-target="timeFormat"
                            data-testid="bp-TimestampControl-button"
                            onKeyDown={stopMenuTriggerKeyPropagation}
                            type="button"
                        >
                            {renderBlueprintTime()}
                            {renderChevron()}
                        </button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content
                        align="center"
                        container={portalContainer}
                        data-testid="bp-TimestampControl-flyout"
                        onKeyDown={handleMenuKeyDown}
                        side="top"
                    >
                        <DropdownMenu.SubHeader>{__('media_time_format')}</DropdownMenu.SubHeader>
                        <DropdownMenu.RadioGroup
                            onValueChange={(value): void => setFormat(value as TimeFormat)}
                            value={format}
                        >
                            {FORMAT_OPTIONS.map(({ label, value }) => (
                                <DropdownMenu.RadioSelectItem
                                    key={value}
                                    data-resin-target={`timeFormat-${value}`}
                                    value={value}
                                >
                                    <Text as="span">{label()}</Text>
                                </DropdownMenu.RadioSelectItem>
                            ))}
                        </DropdownMenu.RadioGroup>
                    </DropdownMenu.Content>
                </DropdownMenu.Root>
            </div>
        );
    }

    if (!canChangeTimeFormat) {
        return (
            <div className="bp-TimestampControl" data-testid="bp-TimestampControl">
                <span className="bp-TimestampControl-static" data-testid="bp-TimestampControl-static">
                    <span className="bp-TimestampControl-current">{formatTime(currentTime)}</span>
                    {!isNarrowWidth && (
                        <>
                            <span className="bp-TimestampControl-separator">/</span>
                            <span className="bp-TimestampControl-duration">{formatTime(durationTime)}</span>
                        </>
                    )}
                </span>
            </div>
        );
    }

    return (
        <div ref={containerElRef} className="bp-TimestampControl" data-testid="bp-TimestampControl">
            <button
                ref={buttonElRef}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-label={__('media_time_format')}
                className={classNames('bp-TimestampControl-button', { 'bp-is-open': isOpen })}
                data-resin-target="timeFormat"
                data-testid="bp-TimestampControl-button"
                onClick={(): void => setIsOpen(!isOpen)}
                onKeyDown={handleKeyDown}
                type="button"
            >
                <span ref={currentElRef} className="bp-TimestampControl-current">
                    {formatLabel(currentTime, format, fps)}
                </span>
                {!isNarrowWidth && (
                    <>
                        <span className="bp-TimestampControl-separator">/</span>
                        <span className="bp-TimestampControl-duration">
                            {format === TimeFormat.FRAMES
                                ? Math.floor(durationTime * fps).toString()
                                : formatLabel(durationTime, format, fps)}
                        </span>
                    </>
                )}
                {renderChevron()}
            </button>
            {isOpen && (
                <div
                    className="bp-TimestampControl-flyout"
                    data-testid="bp-TimestampControl-flyout"
                    onKeyDown={handleKeyDown}
                    role="listbox"
                    tabIndex={-1}
                >
                    <div className="bp-TimestampControl-header">{__('media_time_format')}</div>
                    {FORMAT_OPTIONS.map(({ label, value }) => (
                        <div
                            key={value}
                            aria-selected={format === value}
                            className="bp-TimestampControl-listitem"
                            data-resin-target={`timeFormat-${value}`}
                            onClick={(): void => handleSelect(value)}
                            onKeyDown={createKeyDownHandler(value)}
                            role="option"
                            tabIndex={0}
                        >
                            <span className="bp-TimestampControl-listitem-label">{label()}</span>
                            {format === value && (
                                <IconCheckMark24 className="bp-TimestampControl-check" height={20} width={20} />
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
