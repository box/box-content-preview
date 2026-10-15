import React from 'react';
import { LoadingIndicator, Text } from '@box/blueprint-web';
import './WaveformGeneratingIndicator.scss';

type Props = {
    isBlueprintEnabled?: boolean;
};

export default function WaveformGeneratingIndicator({ isBlueprintEnabled = false }: Props): JSX.Element {
    const label = __('media_generating_waveform');

    return (
        <div
            aria-live="polite"
            className="bp-WaveformGeneratingIndicator"
            data-testid="bp-waveform-generating"
            role="status"
        >
            {isBlueprintEnabled ? (
                <div
                    aria-hidden="true"
                    className="bp-WaveformGeneratingIndicator-bars bp-WaveformGeneratingIndicator-bars--blueprint"
                >
                    <LoadingIndicator aria-label={label} variant="light" />
                </div>
            ) : (
                <span aria-hidden="true" className="bp-WaveformGeneratingIndicator-bars">
                    <span className="bp-WaveformGeneratingIndicator-bar" />
                    <span className="bp-WaveformGeneratingIndicator-bar" />
                    <span className="bp-WaveformGeneratingIndicator-bar" />
                </span>
            )}
            {isBlueprintEnabled ? (
                <Text as="span" color="textOnDarkDefault" variant="bodyDefault">
                    {label}
                </Text>
            ) : (
                <span className="bp-WaveformGeneratingIndicator-label">{label}</span>
            )}
        </div>
    );
}
