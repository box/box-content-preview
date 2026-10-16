import React from 'react';
import { render, screen } from '@testing-library/react';
import BlueprintProviders from '../../../../BlueprintProviders';
import WaveformShuttleIndicator from '../WaveformShuttleIndicator';

describe('WaveformShuttleIndicator', () => {
    test.each`
        direction    | isReverse
        ${'forward'} | ${false}
        ${'reverse'} | ${true}
    `('should show the $direction shuttle rate', ({ direction, isReverse }) => {
        render(<WaveformShuttleIndicator direction={direction} rate={2} />);

        const indicator = screen.getByTestId('bp-waveform-shuttle');
        expect(indicator).toHaveAttribute('role', 'status');
        expect(indicator).toHaveTextContent('2x');
        expect(indicator.classList.contains('bp-is-reverse')).toBe(isReverse);
        expect(indicator.querySelector('[data-typography]')).not.toBeInTheDocument();
    });

    test('should render the rate as Blueprint text when isBlueprintEnabled is true', () => {
        render(<WaveformShuttleIndicator direction="forward" isBlueprintEnabled rate={4} />, {
            wrapper: BlueprintProviders,
        });

        expect(screen.getByTestId('bp-waveform-shuttle').querySelector('[data-typography]')).toHaveTextContent('4x');
    });
});
