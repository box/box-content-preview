import React from 'react';
import classNames from 'classnames';
import formatTimecode from '../../media/formatTimecode';
import IconCheckMark24 from '../icons/IconCheckMark24';
import IconChevronDownMedium24 from '../icons/IconChevronDownMedium24';
import IconChevronUpMedium24 from '../icons/IconChevronUpMedium24';
import useClickOutside from '../hooks/useClickOutside';
import { DEFAULT_FPS } from '../../media/videoFps';
import { decodeKeydown, replacePlaceholders } from '../../../util';
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
    isNarrowWidth?: boolean;
    mediaEl?: HTMLVideoElement | null;
};

export function formatLabel(time: number, format: TimeFormat, fps: number): string {
    switch (format) {
        case TimeFormat.TIMECODE:
            return formatTimecode(time, fps);
        case TimeFormat.FRAMES:
            return replacePlaceholders(__('media_frame_number'), [Math.floor(time * fps).toString()]);
        case TimeFormat.STANDARD:
        default:
            return formatTime(time);
    }
}

const FORMAT_OPTIONS = [
    { label: () => __('media_time_format_standard'), value: TimeFormat.STANDARD },
    { label: () => __('media_time_format_timecode'), value: TimeFormat.TIMECODE },
    { label: () => __('media_time_format_frames'), value: TimeFormat.FRAMES },
];

export default function TimestampControl({
    currentTime = 0,
    durationTime = 0,
    fps = DEFAULT_FPS,
    isNarrowWidth = false,
    mediaEl,
}: Props): JSX.Element {
    const [format, setFormat] = React.useState<TimeFormat>(TimeFormat.STANDARD);
    const [isOpen, setIsOpen] = React.useState(false);
    const containerElRef = React.useRef<HTMLDivElement>(null);
    const buttonElRef = React.useRef<HTMLButtonElement>(null);
    const currentElRef = React.useRef<HTMLSpanElement>(null);
    const rafIdRef = React.useRef<number>(0);

    useClickOutside(containerElRef, () => setIsOpen(false));

    React.useEffect(() => {
        // Re-render via timeupdate events is too slow (~4Hz) for frame-accurate
        // formats, so update the current time text on animation frames instead
        if (format === TimeFormat.STANDARD || !mediaEl || !currentElRef.current) {
            return undefined;
        }

        const tick = (): void => {
            if (currentElRef.current && mediaEl) {
                currentElRef.current.textContent = formatLabel(mediaEl.currentTime, format, fps);
            }
            rafIdRef.current = requestAnimationFrame(tick);
        };

        const startLoop = (): void => {
            rafIdRef.current = requestAnimationFrame(tick);
        };

        const stopLoop = (): void => {
            cancelAnimationFrame(rafIdRef.current);
        };

        if (!mediaEl.paused) {
            startLoop();
        }

        mediaEl.addEventListener('play', startLoop);
        mediaEl.addEventListener('pause', stopLoop);

        return () => {
            stopLoop();
            mediaEl.removeEventListener('play', startLoop);
            mediaEl.removeEventListener('pause', stopLoop);
        };
    }, [format, fps, mediaEl]);

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

    const handleSelect = (selectedFormat: TimeFormat): void => {
        setFormat(selectedFormat);
        setIsOpen(false);

        if (buttonElRef.current) {
            buttonElRef.current.focus();
        }
    };

    const createKeyDownHandler = (selectedFormat: TimeFormat) => (event: React.KeyboardEvent): void => {
        const key = decodeKeydown(event);

        if (key !== 'Space' && key !== 'Enter') {
            return;
        }

        // Prevent the global media key handling logic, i.e. Space toggling playback
        event.stopPropagation();
        handleSelect(selectedFormat);
    };

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
                {isOpen ? (
                    <IconChevronUpMedium24 className="bp-TimestampControl-chevron" />
                ) : (
                    <IconChevronDownMedium24 className="bp-TimestampControl-chevron" />
                )}
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
