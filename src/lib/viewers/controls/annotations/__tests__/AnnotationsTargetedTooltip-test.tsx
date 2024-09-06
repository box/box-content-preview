import React from 'react';
import { render } from '@testing-library/react';

import AnnotationsTargetedTooltip from '../AnnotationsTargetedTooltip';

describe('AnnotationsTargetedTooltip', () => {
    const getWrapper = (props = {}) =>
        render(
            <AnnotationsTargetedTooltip {...props}>
                <div>Child</div>
            </AnnotationsTargetedTooltip>,
        );

    describe('render', () => {
        beforeEach(() => {
            jest.spyOn(React, 'useContext').mockImplementation(() => ({
                experiences: {
                    tooltipFlowAnnotationsExperience: {
                        canShow: true,
                        onClose: jest.fn(),
                        onComplete: jest.fn(),
                        onShow: jest.fn(),
                    },
                },
                setIsForced: jest.fn(),
            }));
        });

        test('should render tooltip when enabled', () => {
            const wrapper = getWrapper({
                isEnabled: true,
            });

            const tooltip = wrapper.queryByRole('tooltip');
            expect(tooltip).not.toBe(null);
            expect(tooltip?.parentElement?.classList.contains('is-callout')).toBe(true);
        });

        test('should not render tooltip when disabled', () => {
            const wrapper = getWrapper({
                isEnabled: false,
            });

            const tooltip = wrapper.queryByRole('tooltip');
            expect(tooltip).toBe(null);
        });
    });
});
