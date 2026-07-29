import noop from 'lodash/noop';
import React from 'react';
import classNames from 'classnames';
import IconCheckMark24 from '../icons/IconCheckMark24';
import IconChevronDownMedium24 from '../icons/IconChevronDownMedium24';
import IconChevronUpMedium24 from '../icons/IconChevronUpMedium24';
import IconVolumeMed24 from '../icons/IconVolumeMed24';
import useClickOutside from '../hooks/useClickOutside';
import { decodeKeydown } from '../../../util';
import './GeneratedAudioSelect.scss';

export enum GeneratedAudioSource {
    ORIGINAL = 'original',
    GENERATED_EN = 'generated-en',
    GENERATED_FR = 'generated-fr',
    GENERATED_JA = 'generated-ja',
}

export const GENERATED_AUDIO_OPTIONS = [
    { label: 'Original Audio', value: GeneratedAudioSource.ORIGINAL },
    { label: 'English Audio (Generated)', value: GeneratedAudioSource.GENERATED_EN },
    { label: 'French Audio (Generated)', value: GeneratedAudioSource.GENERATED_FR },
    { label: 'Japanese Audio (Generated)', value: GeneratedAudioSource.GENERATED_JA },
];

export type Props = {
    generatedAudioSource?: GeneratedAudioSource;
    onGeneratedAudioSourceChange?: (source: GeneratedAudioSource) => void;
};

export default function GeneratedAudioSelect({
    generatedAudioSource = GeneratedAudioSource.ORIGINAL,
    onGeneratedAudioSourceChange = noop,
}: Props): JSX.Element {
    const [isOpen, setIsOpen] = React.useState(false);
    const containerElRef = React.useRef<HTMLDivElement>(null);
    const buttonElRef = React.useRef<HTMLButtonElement>(null);

    useClickOutside(containerElRef, () => setIsOpen(false));

    const selectedOption =
        GENERATED_AUDIO_OPTIONS.find(({ value }) => value === generatedAudioSource) || GENERATED_AUDIO_OPTIONS[0];

    const handleKeyDown = (event: React.KeyboardEvent): void => {
        const key = decodeKeydown(event);

        if (key === 'Escape' && isOpen) {
            setIsOpen(false);

            if (buttonElRef.current) {
                buttonElRef.current.focus();
            }

            event.stopPropagation();
        }
    };

    const handleSelect = (source: GeneratedAudioSource): void => {
        onGeneratedAudioSourceChange(source);
        setIsOpen(false);

        if (buttonElRef.current) {
            buttonElRef.current.focus();
        }
    };

    const createKeyDownHandler = (source: GeneratedAudioSource) => (event: React.KeyboardEvent): void => {
        const key = decodeKeydown(event);

        if (key !== 'Space' && key !== 'Enter') {
            return;
        }

        event.stopPropagation();
        handleSelect(source);
    };

    return (
        <div ref={containerElRef} className="bp-GeneratedAudioSelect" data-testid="bp-GeneratedAudioSelect">
            <button
                ref={buttonElRef}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-label="Audio track"
                className={classNames('bp-GeneratedAudioSelect-button', { 'bp-is-open': isOpen })}
                data-resin-target="generatedAudioSelect"
                data-testid="bp-GeneratedAudioSelect-button"
                onClick={(): void => setIsOpen(!isOpen)}
                onKeyDown={handleKeyDown}
                title={selectedOption.label}
                type="button"
            >
                <IconVolumeMed24 className="bp-GeneratedAudioSelect-icon" />
                {isOpen ? (
                    <IconChevronUpMedium24 className="bp-GeneratedAudioSelect-chevron" />
                ) : (
                    <IconChevronDownMedium24 className="bp-GeneratedAudioSelect-chevron" />
                )}
            </button>
            {isOpen && (
                <div
                    className="bp-GeneratedAudioSelect-flyout"
                    data-testid="bp-GeneratedAudioSelect-flyout"
                    onKeyDown={handleKeyDown}
                    role="listbox"
                    tabIndex={-1}
                >
                    <div className="bp-GeneratedAudioSelect-header">Audio</div>
                    {GENERATED_AUDIO_OPTIONS.map(({ label, value }) => (
                        <div
                            key={value}
                            aria-selected={generatedAudioSource === value}
                            className="bp-GeneratedAudioSelect-listitem"
                            data-resin-target={`generatedAudio-${value}`}
                            onClick={(): void => handleSelect(value)}
                            onKeyDown={createKeyDownHandler(value)}
                            role="option"
                            tabIndex={0}
                        >
                            <span className="bp-GeneratedAudioSelect-listitem-label">{label}</span>
                            {generatedAudioSource === value && (
                                <IconCheckMark24 className="bp-GeneratedAudioSelect-check" height={20} width={20} />
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
