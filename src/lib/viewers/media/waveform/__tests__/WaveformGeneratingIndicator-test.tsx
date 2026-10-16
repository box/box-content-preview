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
        expect(indicator.querySelectorAll('.bp-WaveformGeneratingIndicator-bar')).toHaveLength(3);
    });

    test('should render Blueprint text and loading indicator when isBlueprintEnabled is true', () => {
        render(<WaveformGeneratingIndicator isBlueprintEnabled />, { wrapper: BlueprintProviders });

        const indicator = screen.getByTestId('bp-waveform-generating');
        expect(screen.getAllByRole('status')).toEqual([indicator]);
        expect(indicator.querySelector('[data-modern]')).toHaveTextContent(__('media_generating_waveform'));
        expect(indicator.querySelector('.bp-WaveformGeneratingIndicator-bar')).not.toBeInTheDocument();
        expect(
            indicator.querySelector('.bp-WaveformGeneratingIndicator-bars--blueprint [role="status"]'),
        ).toBeInTheDocument();
    });
});
