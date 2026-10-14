import React from 'react';
import { Text } from '@box/blueprint-web';
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
            <span aria-hidden="true" className="bp-WaveformGeneratingIndicator-bars">
                <span className="bp-WaveformGeneratingIndicator-bar" />
                <span className="bp-WaveformGeneratingIndicator-bar" />
                <span className="bp-WaveformGeneratingIndicator-bar" />
            </span>
            <span className="bp-WaveformGeneratingIndicator-label">
                {isBlueprintEnabled ? (
                    <Text as="span" color="textOnDarkDefault" variant="bodyDefault">
                        {label}
                    </Text>
                ) : (
                    label
                )}
            </span>
        </div>
    );
}
