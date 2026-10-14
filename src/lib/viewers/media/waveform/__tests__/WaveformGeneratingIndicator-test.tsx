import React from 'react';
import { render, screen } from '@testing-library/react';
import BlueprintProviders from '../../../../BlueprintProviders';
import WaveformGeneratingIndicator from '../WaveformGeneratingIndicator';

describe('WaveformGeneratingIndicator', () => {
    test('should announce generating waveform in the zoom slot', () => {
        render(<WaveformGeneratingIndicator />);

        const indicator = screen.getByTestId('bp-waveform-generating');
        expect(indicator).toHaveAttribute('role', 'status');
        expect(indicator).toHaveTextContent(__('media_generating_waveform'));
        expect(indicator.querySelector('[data-modern]')).not.toBeInTheDocument();
    });

    test('should render the label as Blueprint text when isBlueprintEnabled is true', () => {
        render(<WaveformGeneratingIndicator isBlueprintEnabled />, { wrapper: BlueprintProviders });

        const indicator = screen.getByTestId('bp-waveform-generating');
        expect(indicator).toHaveAttribute('role', 'status');
        expect(indicator.querySelector('[data-modern]')).toHaveTextContent(__('media_generating_waveform'));
    });
});
