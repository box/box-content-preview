import React from 'react';
import { render, screen } from '@testing-library/react';

import AnnotationsTargetedTooltip from '../AnnotationsTargetedTooltip';

describe('AnnotationsTargetedTooltip', () => {
    const renderView = (props = {}) =>
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
            renderView({
                isEnabled: true,
            });

            expect(screen.getByRole('tooltip')).toBeInTheDocument();
        });

        test('should not render tooltip when disabled', () => {
            renderView({
                isEnabled: false,
            });

            expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
        });
    });
});
