import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BlueprintProviders from '../../../../BlueprintProviders';
import SkipButton from '../SkipButton';

describe('SkipButton', () => {
    test.each`
        isBlueprintEnabled | direction     | name                         | resinTarget       | isForward
        ${false}           | ${'backward'} | ${__('media_skip_backward')} | ${'skipBackward'} | ${false}
        ${false}           | ${'forward'}  | ${__('media_skip_forward')}  | ${'skipForward'}  | ${true}
        ${true}            | ${'backward'} | ${__('media_skip_backward')} | ${'skipBackward'} | ${false}
        ${true}            | ${'forward'}  | ${__('media_skip_forward')}  | ${'skipForward'}  | ${true}
    `(
        'should skip $direction when isBlueprintEnabled is $isBlueprintEnabled',
        async ({ direction, isForward, name, resinTarget, isBlueprintEnabled }) => {
            const movePlayback = jest.fn();
            render(
                <SkipButton
                    direction={direction}
                    movePlayback={movePlayback}
                    isBlueprintEnabled={isBlueprintEnabled}
                />,
                {
                    wrapper: BlueprintProviders,
                },
            );

            const button = screen.getByRole('button', { name });
            expect(button).toHaveAttribute('data-resin-target', resinTarget);

            await userEvent.click(button);
            expect(movePlayback).toHaveBeenCalledWith(isForward, 5);
        },
    );
});
