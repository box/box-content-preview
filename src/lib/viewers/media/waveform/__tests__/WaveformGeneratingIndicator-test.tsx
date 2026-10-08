import React from 'react';
import { render, screen } from '@testing-library/react';
import WaveformGeneratingIndicator from '../WaveformGeneratingIndicator';

describe('WaveformGeneratingIndicator', () => {
    test('should announce generating waveform in the zoom slot', () => {
        render(<WaveformGeneratingIndicator />);

        const indicator = screen.getByTestId('bp-waveform-generating');
        expect(indicator).toHaveAttribute('role', 'status');
        expect(indicator).toHaveTextContent(__('media_generating_waveform'));
    });
});
