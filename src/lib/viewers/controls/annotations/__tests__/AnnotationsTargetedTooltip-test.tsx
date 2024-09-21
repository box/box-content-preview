import React from 'react';
import { render, screen } from '@testing-library/react';

import AnnotationsTargetedTooltip from '../AnnotationsTargetedTooltip';

describe('AnnotationsTargetedTooltip', () => {
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
            render(
                <AnnotationsTargetedTooltip isEnabled>
                    <div>Child</div>
                </AnnotationsTargetedTooltip>,
            );

            expect(screen.getByRole('tooltip')).toBeInTheDocument();
        });

        test('should not render tooltip when disabled', () => {
            render(
                <AnnotationsTargetedTooltip isEnabled={false}>
                    <div>Child</div>
                </AnnotationsTargetedTooltip>,
            );

            expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
        });
    });
});
