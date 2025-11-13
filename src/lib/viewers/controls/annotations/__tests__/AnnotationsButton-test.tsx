import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AnnotationsButton from '../AnnotationsButton';
import { AnnotationMode } from '../../../../types';

describe('AnnotationsButton', () => {
    describe('event handlers', () => {
        test('should call the onClick callback with the given mode', async () => {
            const user = userEvent.setup();
            const onClick = jest.fn();
            render(
                <AnnotationsButton mode={AnnotationMode.HIGHLIGHT} onClick={onClick}>
                    Test
                </AnnotationsButton>,
            );

            await user.click(screen.getByRole('button', { name: 'Test' }));

            expect(onClick).toHaveBeenCalledWith(AnnotationMode.HIGHLIGHT);
        });
    });

    describe('render', () => {
        test('should render nothing if not enabled', () => {
            render(
                <AnnotationsButton isEnabled={false} mode={AnnotationMode.HIGHLIGHT} onClick={jest.fn()}>
                    Test
                </AnnotationsButton>,
            );

            expect(screen.queryByRole('button', { name: 'Test' })).not.toBeInTheDocument();
        });

        test('should render a valid output', () => {
            render(
                <AnnotationsButton mode={AnnotationMode.HIGHLIGHT} onClick={jest.fn()}>
                    Test
                </AnnotationsButton>,
            );

            expect(screen.getByRole('button', { name: 'Test' })).toBeInTheDocument();
        });

        test('should apply modernized class when modernizationEnabled is true', () => {
            render(
                <AnnotationsButton mode={AnnotationMode.HIGHLIGHT} modernizationEnabled onClick={jest.fn()}>
                    Test
                </AnnotationsButton>,
            );

            expect(screen.getByRole('button', { name: 'Test' })).toHaveClass('bp-AnnotationsButton--modernized');
        });

        test('should not apply modernized class when modernizationEnabled is false', () => {
            render(
                <AnnotationsButton mode={AnnotationMode.HIGHLIGHT} modernizationEnabled={false} onClick={jest.fn()}>
                    Test
                </AnnotationsButton>,
            );

            expect(screen.getByRole('button', { name: 'Test' })).not.toHaveClass('bp-AnnotationsButton--modernized');
        });
    });
});
