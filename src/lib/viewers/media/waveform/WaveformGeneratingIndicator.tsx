import React from 'react';
import './WaveformGeneratingIndicator.scss';

export default function WaveformGeneratingIndicator(): JSX.Element {
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
            <span className="bp-WaveformGeneratingIndicator-label">{label}</span>
        </div>
    );
}
