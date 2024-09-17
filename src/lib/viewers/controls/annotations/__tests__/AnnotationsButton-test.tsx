import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AnnotationsButton from '../AnnotationsButton';
import { AnnotationMode } from '../../../../types';

describe('AnnotationsButton', () => {
    const renderView = (props = {}) =>
        render(
            <AnnotationsButton mode={AnnotationMode.REGION} onClick={jest.fn()} {...props}>
                Test
            </AnnotationsButton>,
        );

    describe('event handlers', () => {
        test('should call the onClick callback with the given mode', async () => {
            const mode = AnnotationMode.HIGHLIGHT;
            const onClick = jest.fn();
            renderView({ mode, onClick });

            await userEvent.click(screen.getByRole('button', { name: 'Test' }));

            expect(onClick).toHaveBeenCalledWith(mode);
        });
    });

    describe('render', () => {
        test('should render nothing if not enabled', () => {
            renderView({ isEnabled: false });

            expect(screen.queryByRole('button', { name: 'Test' })).not.toBeInTheDocument();
        });

        test('should render a valid output', () => {
            renderView();

            expect(screen.getByRole('button', { name: 'Test' })).toBeInTheDocument();
        });
    });
});
