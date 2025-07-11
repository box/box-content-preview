import React from 'react';
import { render, screen } from '@testing-library/react';
import DurationLabels from '../DurationLabels';

describe('DurationLabels', () => {
    const getWrapper = (props = {}) => render(<DurationLabels currentTime={0} durationTime={60} {...props} />);

    const getContainer = async () => screen.findByTestId('bp-DurationLabels');

    describe('render', () => {
        test('should return a valid wrapper', async () => {
            getWrapper();
            const container = await getContainer();
            expect(container).toBeInTheDocument();
        });

        test.each`
            input    | result
            ${NaN}   | ${'0:00'}
            ${0}     | ${'0:00'}
            ${9}     | ${'0:09'}
            ${105}   | ${'1:45'}
            ${705}   | ${'11:45'}
            ${10800} | ${'3:00:00'}
            ${11211} | ${'3:06:51'}
        `('should render both current and duration time $input to $result', async ({ input, result }) => {
            getWrapper({ currentTime: input, durationTime: input });
            const [current, duration] = await screen.findAllByText(result);

            expect(current).toBeInTheDocument();
            expect(duration).toBeInTheDocument();
        });
    });
});
